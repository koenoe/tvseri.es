/**
 * Media servers whose scrobble webhooks are accepted. The API Router's edge
 * function only lets webhook calls through for these (`infra/api.ts`), and
 * the API has one payload adapter per provider (`routes/scrobble.ts`).
 */
export const SCROBBLE_PROVIDERS = ['plex'] as const;

export type ScrobbleProvider = (typeof SCROBBLE_PROVIDERS)[number];

/**
 * The webhook route, called without the API key: the edge function checks the
 * token instead. Group 1 is the provider. A string because the edge function
 * is built from it.
 */
export const SCROBBLE_WEBHOOK_PATH_SOURCE = `^\\/scrobble\\/provider\\/(${SCROBBLE_PROVIDERS.join('|')})$`;

/** A webhook token: 12 random bytes, hex encoded */
export const WEBHOOK_TOKEN_PATTERN_SOURCE = '^[a-f0-9]{24}$';

/**
 * Prefix of the webhook token keys in the API Router's KeyValueStore (value:
 * the provider). SST's own keys there use a 4-hex namespace plus `:`, and SST
 * never removes keys outside its namespace.
 */
export const WEBHOOK_TOKEN_KV_PREFIX = 'wh:';

/** The Plex webhook event for a watched item; every other event is ignored */
export const PLEX_SCROBBLE_EVENT = 'media.scrobble';
