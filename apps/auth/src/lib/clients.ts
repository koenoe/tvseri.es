import { Resource } from 'sst';

import { clientsFor, createAllowClient } from './allowClient';
import { stageUrls } from './stageUrls';

const IS_PRODUCTION = Resource.App.stage === 'production';

// Every deployed stage serves its apps under its own domain. BASE_DOMAIN
// comes from infra/dns.ts (via infra/auth.ts). Under `sst dev` the website
// runs locally: SST's local runtime sets SST_DEV.
const STAGE = stageUrls({
  baseDomain: process.env.BASE_DOMAIN,
  live: process.env.SST_DEV === 'true',
  stage: Resource.App.stage,
});
const DOMAIN = STAGE.domain;

const CLIENTS = clientsFor(DOMAIN);

/** This issuer's public origin (infra/auth.ts: `auth.<domain>`) */
export const ISSUER_ORIGIN = `https://auth.${DOMAIN}`;

/** The website on this stage: the sign-in pages' logo, Not now and lost-state links */
export const SITE_URL = STAGE.site;

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
