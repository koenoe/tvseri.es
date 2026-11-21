import { issuer } from '@openauthjs/openauth';
import { OauthError } from '@openauthjs/openauth/error';
import { CodeProvider } from '@openauthjs/openauth/provider/code';
import type { OidcProvider } from '@openauthjs/openauth/provider/oidc';
import type { StorageAdapter } from '@openauthjs/openauth/storage/storage';
import { GOOGLE_UNVERIFIED_DESCRIPTION } from '@tvseri.es/constants';
import { subjects, type User } from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';

import { renderCodeEmail } from './lib/codeEmail';
import {
  CONNECTION_IP_HEADER,
  edgeKeyCheck,
  sendSourceFor,
} from './lib/sendLimits';
import { contentSecurityPolicy, FONT } from './ui/assets';
import { CodeUI } from './ui/code';
import { lostStateResponse } from './ui/error';
import { changeAddressPage, SelectUI } from './ui/select';

/**
 * Header the code page's script sends with its verify post. A success then
 * answers `{ next }` instead of the 302, so the page can show “Signed in ·
 * taking you back” before it leaves. Without the script it's the plain 302.
 */
export const SCRIPT_HEADER = 'x-tvs-js';

type Allow = (
  input: Readonly<{ clientID: string; redirectURI: string }>,
  req: Request,
) => Promise<boolean>;

export type AppConfig = Readonly<{
  allow: Allow;
  findOrCreateUser: (
    input: Readonly<{ country: string | null; email: string; name?: string }>,
  ) => Promise<Pick<User, 'id' | 'role'>>;
  /** Where the code form's redirect may go: the clients' callback origins */
  formTargets: readonly string[];
  /**
   * The issuer's public origin (`https://auth.<domain>`): the code form is
   * only taken from its own pages. Behind CloudFront the request URL is the
   * function URL, so it's set rather than read from the request.
   */
  issuer: string;
  /** Google's OIDC provider (a local stand-in in the e2e harness) */
  google: ReturnType<typeof OidcProvider>;
  /** How long a sent code works, in seconds (`CODE_TTL`) */
  codeTtl: number;
  /** The ceiling on code emails per UTC day (`DAILY_SENDS`) */
  dailySends: number;
  /** OpenAuth's refresh hook (our patch): re-reads the user's role on a refresh */
  refresh?: (
    input: Readonly<{
      clientID: string;
      properties: Record<string, unknown>;
      type: string;
    }>,
  ) => Promise<Record<string, unknown> | undefined>;
  /**
   * The auth router's edge key: a request carrying it came through
   * CloudFront, so its viewer address counts for the code send cap
   * (`sendSourceFor`). Empty when there's no router (tests, local runs).
   */
  edgeKey: string;
  sendEmail: (
    message: Readonly<{
      html: string;
      recipient: string;
      subject: string;
      text: string;
    }>,
  ) => Promise<void>;
  /** The website on this stage: the auth pages' way back */
  site: string;
  /** Defaults to OpenAuth's `OPENAUTH_STORAGE` (DynamoDB on AWS) */
  storage?: StorageAdapter;
  ttl: Readonly<{ access: number; refresh: number; reuse: number }>;
}>;

// The issuer keeps the sign-in in this cookie from `/authorize` on; without
// it nothing after the start page can finish.
const hasAuthorization = (req: Request) =>
  /(?:^|;\s*)authorization=/.test(req.headers.get('cookie') ?? '');

const YEAR = 60 * 60 * 24 * 365;

/**
 * OpenAuth builds its own URLs (the discovery document, which CloudFront
 * caches for an hour, the tokens' `iss`, Google's redirect URI) from the
 * request's `x-forwarded-host`, `-proto` and `-port`. Only the host is set
 * by our CloudFront function; a forged port would end up in a cached
 * discovery document and break token checks for every new web and API
 * instance. So the issuer always sees its configured origin.
 *
 * It also gets the connection's own address (the function URL event's
 * `requestContext.http.sourceIp`, from the Lambda adapter's env) for the
 * code send cap, replacing any copy a caller sent.
 */
const atOrigin = (origin: URL) => (req: Request, env: unknown) => {
  const headers = new Headers(req.headers);
  headers.set('x-forwarded-host', origin.host);
  headers.set('x-forwarded-proto', origin.protocol.slice(0, -1));
  headers.delete('x-forwarded-port');
  headers.delete(CONNECTION_IP_HEADER);
  const connection = connectionIp(env);
  if (connection) {
    headers.set(CONNECTION_IP_HEADER, connection);
  }
  return new Request(req, { headers });
};

const connectionIp = (env: unknown): string | undefined => {
  const sourceIp = (
    env as { requestContext?: { http?: { sourceIp?: unknown } } } | undefined
  )?.requestContext?.http?.sourceIp;
  return typeof sourceIp === 'string' ? sourceIp : undefined;
};

/**
 * The auth server: OpenAuth's issuer with our pages, wrapped in a Hono app
 * that adds the security headers to every page, serves the font, lets
 * CloudFront cache the JWKS, and shows the lost-state page when a provider
 * is opened without a sign-in (before a code is sent or Google is opened).
 */
export function createApp(config: AppConfig) {
  // The issuer hands `select` the same `{ key: type }` map
  const providers = { code: 'code', google: 'google' } as const;
  const csp = contentSecurityPolicy(config.formTargets);
  const toIssuer = atOrigin(new URL(config.issuer));
  const checkEdgeKey = edgeKeyCheck(config.edgeKey);

  const issuerApp = issuer({
    allow: config.allow,
    // UnknownStateError: typed @internal in OpenAuth, but the issuer calls it
    error: async () => lostStateResponse(config.site),
    providers: {
      code: CodeProvider({
        ...CodeUI({
          codeTtl: config.codeTtl,
          providers,
          sendCode: async (claims, code) => {
            const recipient = claims.email ?? '';
            const message = renderCodeEmail({ code, ttl: config.codeTtl });
            await config.sendEmail({ ...message, recipient });
          },
          site: config.site,
        }),
        // The patch's send caps beyond one address: per network and per day
        dailySends: config.dailySends,
        source: sendSourceFor(config.edgeKey),
        // The patch's expiry: the same value the email and the page say
        ttl: config.codeTtl,
      }),
      google: config.google,
    },
    refresh: config.refresh,
    select: SelectUI({ site: config.site }),
    storage: config.storage,
    subjects,
    success: async (ctx, value, req) => {
      let email: string | undefined;
      let name: string | undefined;

      // Emails are normalised by the user lookup (lib/db/user.ts)
      if (value.provider === 'google') {
        if (!value.id.email_verified || typeof value.id.email !== 'string') {
          throw new OauthError('access_denied', GOOGLE_UNVERIFIED_DESCRIPTION);
        }
        email = value.id.email;
        name = typeof value.id.name === 'string' ? value.id.name : undefined;
      } else if (value.provider === 'code') {
        email = value.claims.email;
      }

      if (!email) {
        throw new Error('Invalid provider');
      }

      const user = await config.findOrCreateUser({
        country: req.headers.get('cloudfront-viewer-country'),
        email,
        name,
      });
      const response = await ctx.subject('user', {
        id: user.id,
        role: user.role,
      });
      const next = response.headers.get('location');
      // The code page's script: the redirect as data (same origin only; the
      // cookies the issuer cleared are on the context and still go out)
      if (req.headers.get(SCRIPT_HEADER) === '1' && next) {
        return Response.json(
          { next },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
      return response;
    },
    ttl: config.ttl,
  });

  return (
    new Hono()
      .use('*', async (c, next) => {
        // A cheap header check on every request, so any page shows whether
        // the router's edge key arrives
        checkEdgeKey(c.req.raw);
        await next();
        if (c.res.headers.get('content-type')?.startsWith('text/html')) {
          c.res.headers.set('Content-Security-Policy', csp);
          c.res.headers.set('X-Content-Type-Options', 'nosniff');
          c.res.headers.set('X-Frame-Options', 'DENY');
          c.res.headers.set(
            'Referrer-Policy',
            'strict-origin-when-cross-origin',
          );
          // The issuer is only ever served over https (CloudFront)
          c.res.headers.set('Strict-Transport-Security', 'max-age=31536000');
        }
      })
      // The JWKS and the discovery document only change when keys are added
      // (old keys stay valid), so let CloudFront cache them: token verifiers
      // (cold API containers, new Vercel instances) then get them from the
      // edge instead of a possibly cold issuer.
      .use('/.well-known/*', async (c, next) => {
        await next();
        if (c.req.method === 'GET' && c.res.ok) {
          c.header('Cache-Control', 'public, max-age=3600');
        }
      })
      // The font's path carries its hash: CloudFront and browsers keep it a year
      .get(FONT.path, (c) =>
        c.body(FONT.body, 200, {
          'Cache-Control': `public, max-age=${YEAR}, immutable`,
          'Content-Type': 'font/woff2',
        }),
      )
      // A provider opened without a sign-in in this browser (another browser,
      // cookies cleared, older than a day, a bookmarked URL) can't finish:
      // say so now instead of after the email or Google.
      .use(
        `/:provider{${Object.keys(providers).join('|')}}/authorize`,
        async (c, next) => {
          if (!hasAuthorization(c.req.raw)) {
            return lostStateResponse(config.site);
          }
          await next();
        },
      )
      // The code form's posts come from the auth pages only: a matching
      // Origin, or Sec-Fetch-Site same-origin. /token and /revoke are called
      // by servers without an Origin and stay outside.
      .use('/code/*', csrf({ origin: config.issuer }))
      // “Change” on the code page: the start page with the address put back.
      // The issuer's GET would forget it, and a URL would put it in a log.
      .post('/code/authorize', async (c, next) => {
        const form = await c.req.raw
          .clone()
          .formData()
          .catch(() => undefined);
        if (form?.get('action') !== 'change') {
          return next();
        }
        const email = form.get('email');
        return changeAddressPage({
          email: typeof email === 'string' ? email : '',
          providers,
          site: config.site,
        });
      })
      // `mount` (not `route`) keeps the issuer's own error handling
      .mount('/', (req, ...rest) =>
        issuerApp.fetch(toIssuer(req, rest[0]), ...rest),
      )
  );
}
