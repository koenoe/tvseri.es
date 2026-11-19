import type {
  ConnectionCookie,
  ConnectionLatest,
  ImportRow,
  WatchProvider,
} from '@tvseri.es/schemas';

/**
 * What the sync needs from a streaming service, one module per service. A
 * reader only sees the plaintext session; KMS stays with the link route and
 * the sync loop.
 */

/**
 * Stored when the session has no profiles (iPlayer) or doesn't say which
 * (Prime Video). Stored on connections: never change it.
 */
export const NO_PROFILE = 'default';

/**
 * Lookups that may fail on one page before the page is read again later:
 * one title never holds the sync up, and an outage doesn't drop a page.
 */
export const MAX_FAILED_LOOKUPS = 3;

/**
 * - `signed-out`: only the service's own word on the session (its 401/403,
 *   its sign-in page), never a timeout or a title's page; linking again fixes it
 * - `unavailable`: busy or down, twice; the sync tries later
 * - `changed`: an answer not in the service's own shape
 * - `read-failed`: any other refusal
 */
export type ReadFailureReason =
  | 'changed'
  /** The session now reads another profile than the linked one */
  | 'profile-changed'
  | 'read-failed'
  | 'signed-out'
  | 'unavailable';

export type ReadFailure = Readonly<{
  ok: false;
  reason: ReadFailureReason;
  /** An `unavailable` service's `Retry-After`; the sync waits that long instead of its own pause */
  retryAfterSeconds?: number;
}>;

export type HistoryEntry = Readonly<{
  /** The service's own id for the entry: the review list remembers it by this */
  key: string;
  /** Null for a film: counted, never written or kept for review */
  row: ImportRow | null;
  /**
   * Played but not to the end (the service's own progress says so): read
   * past, never written, counted or kept for review
   */
  unfinished?: true;
  /** Epoch ms */
  watchedAt: number;
}>;

export type HistoryPage = Readonly<{
  /** Newest first */
  entries: ReadonlyArray<HistoryEntry>;
  /** Entries not in the service's documented shape: left out, counted */
  invalid: number;
  /**
   * iPlayer's pages hold unfinished plays, so a page can be empty with more
   * after it. Unset, an empty page is the end.
   */
  more?: boolean;
}>;

/**
 * An opaque-cursor history's position (Prime Video). Stored with each
 * checkpoint, so a resumed run reads on instead of walking there.
 */
export type PageCursor = Readonly<{ page: number; token: string }>;

export type ReadPageOptions = Readonly<{
  /**
   * At or before the page asked for. `null`: no page after the last one read.
   * Absent: walk from the first page.
   */
  from?: PageCursor | null;
  /** Whether the step may make another request (a walk to the page stops when not) */
  hasTime: () => boolean;
}>;

export type PageRead =
  | Readonly<{
      ok: true;
      page: HistoryPage;
      /** Absent for a service whose pages are numbered */
      next?: PageCursor | null;
    }>
  /** Out of time walking to the page: how far it got, for the next step */
  | Readonly<{ ok: true; walking: PageCursor }>;

export type HistorySession = Readonly<{
  /** Page `page` (from 0), newest first; an empty page is the end unless it says `more` */
  readPage: (
    page: number,
    options?: ReadPageOptions,
  ) => Promise<PageRead | ReadFailure>;
  /** The service may renew the session on any read */
  secret: string;
}>;

export type LinkedSession = Readonly<{
  ok: true;
  /** The newest entry, for the card's overview before the first sync */
  latest: ConnectionLatest | null;
  profileId: string;
  profileName: string | null;
  secret: string;
  /** The history's size, when the service says */
  total: number | null;
}>;

export type ServiceReader = Readonly<{
  label: string;
  /** Proves the browser's session works before anything is stored */
  link: (
    cookies: ReadonlyArray<ConnectionCookie>,
  ) => Promise<LinkedSession | ReadFailure>;
  open: (
    secret: string,
    profileId: string,
  ) => Promise<Readonly<{ ok: true; session: HistorySession }> | ReadFailure>;
  /** Where the synced episodes (and review picks) say they were watched */
  watchProvider: WatchProvider;
}>;
