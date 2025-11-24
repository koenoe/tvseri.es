import { issuer } from '@openauthjs/openauth';
import { CodeProvider } from '@openauthjs/openauth/provider/code';
import { CodeUI } from '@openauthjs/openauth/ui/code';
import { THEME_SST, type Theme } from '@openauthjs/openauth/ui/theme';
import { handle } from 'hono/aws-lambda';
import { createUser, findUser } from './db';
import { subjects } from './subjects';

const MY_THEME: Theme = {
  ...THEME_SST,
  title: 'tvseri.es',
};

const app = issuer({
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (email, code) => {
          console.log(email, code);
        },
      }),
    ),
  },
  subjects,
  success: async (ctx, value) => {
    if (value.provider === 'code') {
      let user = await findUser({ email: value.claims.email! });
      if (!user) {
        user = await createUser({ email: value.claims.email! });
      }
      return ctx.subject('user', user);
    }
    throw new Error('Invalid provider');
  },
  theme: MY_THEME,
  ttl: {
    access: 300, // tmp 5 minutes
    refresh: 60 * 60 * 1, // tmp 1 hour
  },
});

export const handler = handle(app);
