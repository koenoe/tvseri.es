import { issuer } from '@openauthjs/openauth';
import { CodeProvider } from '@openauthjs/openauth/provider/code';
import { GoogleOidcProvider } from '@openauthjs/openauth/provider/google';
import { subjects } from '@tvseri.es/schemas';
import { handle } from 'hono/aws-lambda';
import { Resource } from 'sst';
import { createUser, findUser } from './lib/db/user';
import { sendEmail } from './lib/email';
import { CodeUI, SelectUI } from './ui';

const ttl = {
  access: 60 * 5, // tmp 5 minutes, change to: 60 * 60 * 24 = 1 day
  refresh: 60 * 60 * 1, // tmp 1 hour, change to: 60 * 60 * 24 * 365 = 1 year
  reuse: 60 * 60 * 1, // tmp 1 hour, disables strict refresh token rotation
};

const app = issuer({
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (claims, code) => {
          await sendEmail({
            body: `Your OTP is <strong>${code}</strong>`,
            recipient: claims.email!,
            sender: 'auth',
            subject: `Your OTP: ${code}`,
          });
        },
      }),
    ),
    google: GoogleOidcProvider({
      clientID: Resource.GoogleClientId.value,
      scopes: ['openid', 'email', 'profile'],
    }),
  },
  select: SelectUI(),
  subjects,
  success: async (ctx, value, req) => {
    let email: string | undefined;
    let name: string | undefined;

    if (value.provider === 'google') {
      if (!value.id.email_verified) {
        throw new Error('Google email not verified');
      }

      email = value.id.email as string;
      name = value.id.name as string;
    } else if (value.provider === 'code') {
      email = value.claims.email;
    }

    if (email) {
      let user = await findUser({ email });
      if (!user) {
        user = await createUser({
          country: req.headers.get('cloudfront-viewer-country'),
          email,
          name,
        });
      }

      return ctx.subject('user', {
        id: user.id,
      });
    }

    throw new Error('Invalid provider');
  },
  ttl,
});

export const handler = handle(app);
