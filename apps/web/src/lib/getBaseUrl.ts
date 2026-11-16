/**
 * The site's origin (no trailing slash), from configuration only, never from
 * the request's Host header. Read per call, so builds need no env.
 *
 * 1. `next dev`: localhost on the dev server's port.
 * 2. `SITE_URL`: the configured origin of the stage (set by infra/web.ts for
 *    every deployed build). The auth server only accepts login callbacks on
 *    it, so it wins over Vercel's system URLs.
 * 3. Vercel's system URLs, then localhost on the server's port.
 */
export default function getBaseUrl(): string {
  const env = process.env;

  if (env.NODE_ENV === 'development') {
    return `http://localhost:${env.PORT ?? '3000'}`;
  }
  if (env.SITE_URL) {
    return env.SITE_URL.replace(/\/+$/, '');
  }
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_ENV === 'preview' && env.VERCEL_BRANCH_URL) {
    return `https://${env.VERCEL_BRANCH_URL}`;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }

  // `next start` without configuration (local builds, e2e)
  return `http://localhost:${env.PORT ?? '3000'}`;
}
