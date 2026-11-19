import * as v from 'valibot';

import { ConnectionServiceSchema } from './connection-service';
import {
  EpisodeOptionSchema,
  ImportBatchSchema,
  SeriesCandidateSchema,
} from './import';
import { RecentScrobbleSchema } from './webhook';

/**
 * Linking a streaming service to a viewer's account. The extension posts the
 * service's browser session to the public link route with a short-lived code
 * the viewer's Connected apps card minted. The code is the extension's only
 * proof: it never sees the tvseri.es session.
 */

/** Generous for a real jar (Netflix sets ~15), small enough to stay bounded */
const MAX_COOKIES = 100;

/**
 * The whole jar's serialised size. Sealed and base64'd it grows by about a
 * third, and the stored item must stay under DynamoDB's 400 KB item limit.
 */
const MAX_JAR_CHARS = 128 * 1024;

/**
 * One stored cookie of a service session. Lenient on purpose: one odd cookie
 * the service renews must not make the stored jar unreadable.
 */
export const ConnectionCookieSchema = v.object({
  // Hostnames top out at 253 characters
  domain: v.pipe(v.string(), v.maxLength(253)),
  expiresDate: v.nullable(v.number()),
  httpOnly: v.boolean(),
  name: v.pipe(v.string(), v.maxLength(256)),
  path: v.pipe(v.string(), v.maxLength(1024)),
  sameSite: v.nullable(v.pipe(v.string(), v.maxLength(32))),
  secure: v.boolean(),
  // Browsers cap a cookie at 4096 bytes, name and value together
  value: v.pipe(v.string(), v.maxLength(4096)),
});
export type ConnectionCookie = v.InferOutput<typeof ConnectionCookieSchema>;

/** RFC 6265's cookie-name: an HTTP token */
const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
/** RFC 6265's cookie-value: cookie-octets, bare or in double quotes */
const COOKIE_VALUE =
  /^(?:[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*|"[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*")$/;

/**
 * Whether a cookie fits a `Cookie` header per RFC 6265. Others are dropped
 * from a link rather than refusing it, so nothing stored can split a header;
 * the session cookies a read needs are always well formed.
 */
const fitsHeader = (cookie: Readonly<{ name: string; value: string }>) =>
  cookie.name.length <= 256 &&
  cookie.value.length <= 4096 &&
  COOKIE_NAME.test(cookie.name) &&
  COOKIE_VALUE.test(cookie.value);

const LinkCodeValueSchema = v.pipe(v.string(), v.regex(/^\d{4}$/));

/** The body the extension posts to the public link route. */
export const ConnectionLinkRequestSchema = v.object({
  code: LinkCodeValueSchema,
  cookies: v.pipe(
    v.array(ConnectionCookieSchema),
    v.transform((cookies) => cookies.filter(fitsHeader)),
    v.maxLength(MAX_COOKIES),
    v.check(
      (cookies) => JSON.stringify(cookies).length <= MAX_JAR_CHARS,
      'The cookie jar is too large',
    ),
  ),
  /**
   * The sync reads as this browser, which a service may have tied the session
   * to. Older extensions don't send it.
   */
  userAgent: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1),
      v.maxLength(512),
      // Printable ASCII: what a header carries as is
      v.regex(/^[\x20-\x7E]+$/),
    ),
  ),
});

/** `POST /me/connections/link-code`: a code links only this service */
export const LinkCodeRequestSchema = v.object({
  service: ConnectionServiceSchema,
});

/**
 * A minted link code: five minutes, single use, bound to the viewer, and
 * only one live per viewer (a new one revokes the last).
 */
export const LinkCodeSchema = v.object({
  code: LinkCodeValueSchema,
  expiresAt: v.number(),
});
export type LinkCode = v.InferOutput<typeof LinkCodeSchema>;

/**
 * The link route's answer. `bad-code` covers unknown, expired, used and
 * other-service codes; the web's forward adds its own `rate-limited` and
 * `unavailable`.
 */
export const ConnectionLinkReplySchema = v.union([
  v.object({ ok: v.literal(true), profile: v.nullable(v.string()) }),
  v.object({
    ok: v.literal(false),
    reason: v.picklist([
      'bad-code',
      'rate-limited',
      'signed-out',
      'test-read-failed',
      'unavailable',
    ]),
  }),
]);
export type ConnectionLinkReply = v.InferOutput<
  typeof ConnectionLinkReplySchema
>;

/** `POST /connections/:service/link/check`: checks a code without spending it */
export const ConnectionLinkCheckRequestSchema = v.object({
  code: LinkCodeValueSchema,
});

/**
 * Whose account a code links to, shown before Continue: a code someone else
 * sent would link the viewer's history to their account. A `bad-code` counts
 * as a failed link attempt.
 */
export const ConnectionLinkCheckReplySchema = v.union([
  v.object({ ok: v.literal(true), username: v.string() }),
  v.object({
    ok: v.literal(false),
    reason: v.picklist(['bad-code', 'rate-limited', 'unavailable']),
  }),
]);

/** The newest entry of the viewing history */
export const ConnectionLatestSchema = v.object({
  episodeTitle: v.nullable(v.string()),
  title: v.string(),
  /** Epoch milliseconds, as the service dates it */
  watchedAt: v.number(),
});
export type ConnectionLatest = v.InferOutput<typeof ConnectionLatestSchema>;

/** Netflix leaves fields out or sends them oddly: read those as absent */
const optionalOrAbsent = <T extends v.GenericSchema>(schema: T) =>
  v.fallback(v.optional(schema), undefined);

/**
 * One entry of Netflix's `viewingActivity`. A film has no `series`;
 * `movieID` is the title's own id (the episode's, for an episode), which the
 * sync remembers entries by. `seasonDescriptor` may be localised.
 */
export const NetflixViewedItemSchema = v.object({
  /** Epoch milliseconds */
  date: v.number(),
  episodeTitle: optionalOrAbsent(v.string()),
  movieID: v.number(),
  seasonDescriptor: optionalOrAbsent(v.string()),
  // A number (the show's id) everywhere seen so far; a flag is read alike
  series: optionalOrAbsent(v.union([v.number(), v.boolean()])),
  seriesTitle: optionalOrAbsent(v.string()),
  title: v.string(),
});
export type NetflixViewedItem = v.InferOutput<typeof NetflixViewedItemSchema>;

/** Whether the service still accepts the stored session */
export const CONNECTION_STATUSES = ['ok', 'signed-out'] as const;

const CONNECTION_SYNC_STATES = ['queued', 'running', 'ok', 'failed'] as const;

/**
 * Why a sync failed. `changed`: the history changed shape; `rate-limited`
 * also covers 5xx and timeouts.
 */
export const CONNECTION_SYNC_ERRORS = [
  'signed-out',
  // The session now reads another profile than the one linked
  'profile-changed',
  'changed',
  'rate-limited',
  'failed',
] as const;
export type ConnectionSyncError = (typeof CONNECTION_SYNC_ERRORS)[number];

/**
 * A sync run as the card shows it; parsing the stored run through this drops
 * the API's bookkeeping
 */
export const ConnectionSyncRunSchema = v.object({
  error: v.nullable(v.picklist(CONNECTION_SYNC_ERRORS)),
  /** Entries that were films: counted, never written */
  films: v.number(),
  /** Epoch ms; null while it runs */
  finishedAt: v.nullable(v.number()),
  /** Epoch ms */
  requestedAt: v.number(),
  /** Episodes already in the history: their dates kept */
  skipped: v.number(),
  state: v.picklist(CONNECTION_SYNC_STATES),
  /** Entries this sync added to the review list */
  unresolved: v.number(),
  /** Entries past the review list's cap: counted only */
  unresolvedOverflow: v.number(),
  /** New episodes written */
  written: v.number(),
});

const ConnectionSyncSummarySchema = v.object({
  ...ConnectionSyncRunSchema.entries,
  /**
   * Quiet past the API's stale limit: the run is dead, and Sync now may start
   * the next one, which carries on from it
   */
  stalled: v.boolean(),
});

/** What a service's card in Connected apps shows */
export const ConnectionStatusSchema = v.object({
  connected: v.boolean(),
  /** When the sync last ran to the end; null until the first sync */
  lastSyncedAt: v.nullable(v.number()),
  latest: v.nullable(ConnectionLatestSchema),
  profileName: v.nullable(v.string()),
  /**
   * The latest episodes the sync wrote, newest first (≤ 5); CSV imports
   * are not in it
   */
  recent: v.array(RecentScrobbleSchema),
  /** Null when not connected */
  status: v.nullable(v.picklist(CONNECTION_STATUSES)),
  /** Null until the first sync is asked for */
  sync: v.nullable(ConnectionSyncSummarySchema),
  total: v.nullable(v.number()),
  /** Open entries in the review list */
  unresolvedCount: v.number(),
  /**
   * Every episode the sync wrote with a watch date in the last 8 days,
   * newest first (≤ 200), for the browser's last-seven-days graph
   */
  week: v.array(RecentScrobbleSchema),
});
export type ConnectionStatus = v.InferOutput<typeof ConnectionStatusSchema>;

const ImportCellSchema = v.union([v.string(), v.number()]);

/**
 * A synced entry the matcher couldn't settle, kept for the review list.
 * `key` is the entry's id at the service, which resolve and dismiss take.
 */
export const ConnectionUnresolvedSchema = v.object({
  /** `ambiguous`: the series to pick from (best first, ≤ 4) */
  candidates: v.optional(v.array(SeriesCandidateSchema)),
  /** `episode-not-found`: the series' episodes to pick from (≤ 60) */
  episodes: v.optional(v.array(EpisodeOptionSchema)),
  key: v.string(),
  kind: v.picklist(['ambiguous', 'series-not-found', 'episode-not-found']),
  row: v.object({
    episode: ImportCellSchema,
    season: ImportCellSchema,
    title: v.string(),
  }),
  /** `episode-not-found`: the series it matched */
  series: v.optional(SeriesCandidateSchema),
  /** Epoch ms */
  watchedAt: v.number(),
});
export type ConnectionUnresolved = v.InferOutput<
  typeof ConnectionUnresolvedSchema
>;

export const ConnectionUnresolvedPageSchema = v.object({
  items: v.array(ConnectionUnresolvedSchema),
  /** Pass back as `?cursor=` for the next page; null on the last */
  nextCursor: v.nullable(v.string()),
});
export type ConnectionUnresolvedPage = v.InferOutput<
  typeof ConnectionUnresolvedPageSchema
>;

/**
 * A review-list key, also the list's page cursor. Never a `#`: the key ends
 * the stored sort key (`UNRESOLVED#{service}#{key}`).
 */
export const UnresolvedKeySchema = v.pipe(v.string(), v.regex(/^[\w-]{1,64}$/));

/** Keys one resolve or dismiss call takes */
export const UNRESOLVED_KEYS_PER_CALL = 100;

const UnresolvedKeysSchema = v.pipe(
  v.array(UnresolvedKeySchema),
  v.minLength(1),
  v.maxLength(UNRESOLVED_KEYS_PER_CALL),
);

/** The review list's groups, as Skip all takes them */
export const UNRESOLVED_GROUPS = ['ambiguous', 'not-found'] as const;
export type UnresolvedGroup = (typeof UNRESOLVED_GROUPS)[number];

/** `POST …/unresolved/dismiss-all?group=`: one group, or all when absent */
export const ConnectionDismissAllQuerySchema = v.object({
  group: v.optional(v.picklist(UNRESOLVED_GROUPS)),
});

/** `POST /me/connections/:service/unresolved/dismiss` */
export const ConnectionDismissRequestSchema = v.object({
  keys: UnresolvedKeysSchema,
});

/**
 * `POST /me/connections/:service/unresolved/resolve`: writes the picked
 * episodes as the sync would; the entries leave the list for good
 */
export const ConnectionResolveRequestSchema = v.object({
  items: ImportBatchSchema,
  keys: UnresolvedKeysSchema,
});
