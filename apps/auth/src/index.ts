import { issuer } from '@openauthjs/openauth';
import { OauthError } from '@openauthjs/openauth/error';
import { CodeProvider } from '@openauthjs/openauth/provider/code';
import { GoogleOidcProvider } from '@openauthjs/openauth/provider/google';
import { subjects } from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { Resource } from 'sst';
import { allowClient } from './lib/clients';
import { createUser, findUser } from './lib/db/user';
import { sendEmail } from './lib/email';
import { CodeUI, SelectUI } from './ui';

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

const issuerApp = issuer({
  allow: allowClient,
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

    // Emails are normalised by the user lookup (lib/db/user.ts)
    if (value.provider === 'google') {
      if (!value.id.email_verified || typeof value.id.email !== 'string') {
        throw new OauthError(
          'access_denied',
          'Your Google account has no verified email address',
        );
      }

      email = value.id.email;
      name = typeof value.id.name === 'string' ? value.id.name : undefined;
    } else if (value.provider === 'code') {
      email = value.claims.email;
    }

    if (email) {
      const user = await findOrCreateUser({
        country: req.headers.get('cloudfront-viewer-country'),
        email,
        name,
      });

      return ctx.subject('user', {
        id: user.id,
        role: user.role,
      });
    }

    throw new Error('Invalid provider');
  },
  ttl,
});

// The JWKS and the discovery document only change when keys are added (old
// keys stay valid), so let CloudFront cache them: token verifiers (cold API
// containers, new Vercel instances) then get them from the edge instead of a
// possibly cold issuer. OpenAuth registers its routes itself, so wrap it to
// add the header. `mount` (not `route`) keeps the issuer's own error handling
// exactly as before.
const app = new Hono()
  .use('/.well-known/*', async (c, next) => {
    await next();
    if (c.req.method === 'GET' && c.res.ok) {
      c.header('Cache-Control', 'public, max-age=3600');
    }
  })
  .mount('/', issuerApp.fetch);

export const handler = handle(app);
