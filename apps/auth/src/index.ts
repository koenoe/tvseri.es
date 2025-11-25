import { issuer } from '@openauthjs/openauth';
import { CodeProvider } from '@openauthjs/openauth/provider/code';
// import { PasswordProvider } from '@openauthjs/openauth/provider/password';
// import { PasswordUI } from '@openauthjs/openauth/ui/password';
import { handle } from 'hono/aws-lambda';
import { createUser, findUser } from './db';
import { subjects } from './subjects';
import { CodeUI, SelectUI } from './ui';

const codeUI = CodeUI({
  sendCode: async (claims, code) => {
    console.log(claims.email, code);
  },
});

const app = issuer({
  providers: {
    code: CodeProvider(codeUI),
    // password: PasswordProvider(
    //   PasswordUI({
    //     copy: {
    //       error_email_taken: 'This email is already taken.',
    //     },
    //     sendCode: async (email, code) => {
    //       console.log(email, code);
    //     },
    //   }),
    // ),
  },
  select: SelectUI(),
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
  ttl: {
    access: 300, // tmp 5 minutes
    refresh: 60 * 60 * 1, // tmp 1 hour
  },
});

export const handler = handle(app);
