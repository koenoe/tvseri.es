import 'server-only';

import type { ScrobbleProvider } from '@tvseri.es/constants';

/**
 * The webhook URL up to the token. It's on the site's domain (the URL users
 * already pasted into their media server); next.config.ts rewrites it to the
 * API at Vercel's CDN, without running a function.
 */
export default function webhookUrlPrefix(type: ScrobbleProvider) {
  return `${process.env.SITE_URL}/api/webhooks/scrobble/${type}?token=`;
}
