import type { ScrobbleProvider } from '@tvseri.es/constants';

/**
 * The webhook URL up to the token. Users paste it into their media server,
 * so its shape is a promise: `<site>/api/webhooks/scrobble/<provider>?token=`
 * (next.config.ts rewrites it to the API at the CDN). Built from the site's
 * configured origin, never from a request header.
 */
export const webhookUrlPrefix = (origin: string, provider: ScrobbleProvider) =>
  `${origin}/api/webhooks/scrobble/${provider}?token=`;

/** The dots standing in for a hidden token */
export const TOKEN_MASK = '•'.repeat(24);

export const webhookUrl = (
  origin: string,
  provider: ScrobbleProvider,
  token: string,
) => `${webhookUrlPrefix(origin, provider)}${token}`;
