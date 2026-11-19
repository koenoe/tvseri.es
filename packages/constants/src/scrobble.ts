/**
 * Media servers whose scrobble webhooks are accepted. The API Router's edge
 * function only lets webhook calls through for these (`infra/apiEdgeInjection.ts`), and
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

/**
 * Where a Plex scrobble says it was watched. Undo of an unmark puts it back
 * on the record, so the scrobble and the restore share it.
 */
export const PLEX_WATCH_PROVIDER = {
  id: 0,
  logo: '',
  logoPath: '/vLZKlXUNDcZR7ilvfY9Wr9k80FZ.jpg',
  name: 'Plex',
} as const;

/**
 * Where a Netflix sync says it was watched: TMDB's Netflix provider, so a
 * synced episode reads like one marked by hand with Netflix picked
 */
export const NETFLIX_WATCH_PROVIDER = {
  id: 8,
  logo: '',
  logoPath: '/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
  name: 'Netflix',
} as const;

/** Where a BBC iPlayer sync says it was watched: TMDB's BBC iPlayer provider */
export const BBC_IPLAYER_WATCH_PROVIDER = {
  id: 38,
  logo: '',
  logoPath: '/nc8Tpsr8SqCbsTUogPDD06gGzB3.jpg',
  name: 'BBC iPlayer',
} as const;

/** Where a Prime Video sync says it was watched: TMDB's Amazon Prime Video provider */
export const PRIME_VIDEO_WATCH_PROVIDER = {
  id: 9,
  logo: '',
  logoPath: '/pvske1MyAoymrs5bguRfVqYiM9a.jpg',
  name: 'Amazon Prime Video',
} as const;
