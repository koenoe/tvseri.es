import { GoogleOidcProvider } from '@openauthjs/openauth/provider/google';
import { handle } from 'hono/aws-lambda';
import { Resource } from 'sst';

import { createApp } from './app';
import {
  allowClient,
  CLIENT_ORIGINS,
  ISSUER_ORIGIN,
  SITE_URL,
} from './lib/clients';
import { CODE_TTL } from './lib/codeLifetime';
import { createUser, findUser } from './lib/db/user';
import { sendEmail } from './lib/email';
import { createRefreshProperties } from './lib/refresh';
import { DAILY_SENDS } from './lib/sendLimits';

const ttl =
  Resource.App.stage !== 'production'
    ? {
        access: 60 * 10, // 10 minutes
        refresh: 60 * 60 * 24 * 1, // 1 day
        reuse: 60 * 5, // 5 minutes - window for concurrent refresh requests
      }
    : {
        access: 60 * 60 * 24, // 1 day
        refresh: 60 * 60 * 24 * 365, // 1 year
        reuse: 60 * 5, // 5 minutes - window for concurrent refresh requests
      };

const findOrCreateUser = async (
  input: Readonly<{ email: string; name?: string; country: string | null }>,
) => {
  const user = await findUser({ email: input.email });
  if (user) {
    return user;
  }

  try {
    return await createUser(input);
  } catch (error) {
    // A parallel sign-in created the user in the meantime
    const existing =
      error instanceof Error && error.message === 'UserAlreadyExists'
        ? await findUser({ email: input.email })
        : null;
    if (existing) {
      return existing;
    }
    throw error;
  }
};

const app = createApp({
  allow: allowClient,
  codeTtl: CODE_TTL,
  dailySends: DAILY_SENDS,
  findOrCreateUser,
  formTargets: CLIENT_ORIGINS,
  google: GoogleOidcProvider({
    clientID: Resource.GoogleClientId.value,
    scopes: ['openid', 'email', 'profile'],
  }),
  issuer: ISSUER_ORIGIN,
  // A role changed in the database reaches the next refreshed token
  refresh: createRefreshProperties((userId) => findUser({ userId })),
  sendEmail: ({ html, recipient, subject, text }) =>
    sendEmail({ html, recipient, sender: 'auth', subject, text }),
  site: SITE_URL,
  ttl,
});

export const handler = handle(app);
