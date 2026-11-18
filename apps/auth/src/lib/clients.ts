import { Resource } from 'sst';

import { clientsFor, createAllowClient } from './allowClient';

const IS_PRODUCTION = Resource.App.stage === 'production';

// The stage's base domain: infra/dns.ts is its one owner (passed in by
// infra/auth.ts), so the issuer never derives it from the stage itself
const DOMAIN = process.env.BASE_DOMAIN;
if (!DOMAIN) {
  throw new Error('BASE_DOMAIN is not set (infra/auth.ts)');
}

const CLIENTS = clientsFor(DOMAIN);

/** This issuer's public origin (infra/auth.ts: `auth.<domain>`) */
export const ISSUER_ORIGIN = `https://auth.${DOMAIN}`;

/**
 * The website on this stage: the sign-in pages' logo, Not now and lost-state
 * links. Under `sst dev` (SST's local runtime sets SST_DEV) it's the local
 * Next server: `www.<stage>.dev.tvseri.es` doesn't exist then.
 */
export const SITE_URL =
  process.env.SST_DEV === 'true'
    ? 'http://localhost:3000'
    : `https://www.${DOMAIN}`;

/**
 * The clients' origins, for the sign-in pages' CSP `form-action`: the code
 * form's success is a 302 to the client's callback. Local hosts outside
 * production, like `createAllowClient`.
 */
export const CLIENT_ORIGINS: readonly string[] = [
  ...Object.values(CLIENTS).map(({ host }) => `https://${host}`),
  ...(IS_PRODUCTION ? [] : ['http://localhost:*', 'http://127.0.0.1:*']),
];

/** OpenAuth's `allow` callback for this stage (see `createAllowClient`) */
export const allowClient = createAllowClient({
  domain: DOMAIN,
  production: IS_PRODUCTION,
});
