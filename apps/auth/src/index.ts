import { issuer } from '@openauthjs/openauth';
import { CodeProvider } from '@openauthjs/openauth/provider/code';
import { GoogleOidcProvider } from '@openauthjs/openauth/provider/google';
import { handle } from 'hono/aws-lambda';
import { Resource } from 'sst';
import { createUser, findUser } from './db';
import { subjects } from './subjects';
import { CodeUI, SelectUI } from './ui';

const app = issuer({
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (claims, code) => {
          console.log(claims.email, code);
        },
      }),
    ),
    google: GoogleOidcProvider({
      clientID: Resource.GoogleClientId.value,
      scopes: ['openid', 'email'],
    }),
  },
  select: SelectUI(),
  subjects,
  success: async (ctx, value) => {
    console.log('succes:', value);

    let email: string | undefined;
    if (value.provider === 'google') {
      email = value.id.email as string;
    } else if (value.provider === 'code') {
      email = value.claims.email;
    }

    if (email) {
      let user = await findUser({ email });
      if (!user) {
        user = await createUser({ email });
      }
      return ctx.subject('user', user);
    }

    throw new Error('Invalid provider');
  },
  ttl: {
    access: 300, // tmp 5 minutes
    refresh: 60 * 60 * 1, // tmp 1 hour
  },
});

export const handler = handle(app);
