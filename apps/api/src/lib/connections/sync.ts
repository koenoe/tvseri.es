import {
  type Catalog,
  createEpisodeMatcher,
  importItemOf,
  MATCHER_VERSION,
  namesEpisode,
} from '@tvseri.es/import';
import {
  type ConnectionService,
  type ConnectionSyncError,
  type ImportBatch,
  syncTagPrefix,
} from '@tvseri.es/schemas';
import { chunk, sleep } from '@tvseri.es/utils';

import { decryptSecret, encryptSecret } from '@/lib/connections/crypto';
import {
  type Connection,
  getConnection,
  type StoredSync,
} from '@/lib/db/connections';
import {
  checkpointSync,
  failSync,
  finishSync,
  saveRenewedSecret,
} from '@/lib/db/connections/sync';
import {
  addUnresolved,
  closeUnresolved,
  type OpenEntry,
  openEntriesAfter,
} from '@/lib/db/connections/unresolved';
import { writeWatchedBatch } from '@/lib/imports/write';
import { seasonForMark, seriesForMark } from '@/lib/marking/catalog';
import { searchTvSeries } from '@/lib/tmdb';
import { asBrowser, readFailure } from './http';
import { humanPauseMs } from './pace';
import type {
  HistoryEntry,
  HistorySession,
  ReadFailure,
  ReadFailureReason,
  ServiceReader,
} from './reader';
import { READERS } from './readers';
import type { ConnectionSyncMessage } from './request';

/**
 * A connection's sync, the same for every service: reads the history newest
 * first, matches with the CSV import's matcher, writes as the import does and
 * keeps doubtful entries for review. Checkpoints after every page. A later
 * sync stops two days before the last synced watch date. A run ends by
 * re-matching open review entries once per matcher version.
 */

/** `stale`: the run lost its claim. `later`: the same message goes again after that many seconds */
export type SyncOutcome =
  | 'done'
  | 'failed'
  | 'stale'
  | Readonly<{ later: number }>;

/** Service refusals (429/5xx) in a row before the run fails */
const MAX_STRIKES = 3;
/** Unless the service sends `Retry-After` */
const RETRY_DELAY_SECONDS = 300;
/** SQS's longest delay: a longer `Retry-After` gets this, and a strike if still busy */
const MAX_DELAY_SECONDS = 900;

const isOutcome = (value: object | string): value is SyncOutcome | 'continue' =>
  typeof value === 'string' || 'later' in value;
/** The import's batch cap (`ImportBatchSchema`) */
const WRITE_BATCH = 100;

/** The import id a sync's watched writes carry: a chain's (`StoredSync.chainId`), or a review pick's own */
export const syncTag = (service: ConnectionService, id: string) =>
  `${syncTagPrefix(service)}${id}`;

const apiCatalog: Catalog = {
  getSeason: seasonForMark,
  getTvSeries: seriesForMark,
  searchTvSeries: (title) => searchTvSeries(title),
};

export type SyncDeps = Readonly<{
  catalog: Catalog;
  pause: () => Promise<void>;
  readerOf: (service: ConnectionService) => ServiceReader;
}>;

const defaultDeps: SyncDeps = {
  catalog: apiCatalog,
  pause: () => sleep(humanPauseMs()),
  readerOf: (service) => READERS[service],
};

type Run = Readonly<{
  reader: ServiceReader;
  service: ConnectionService;
  userId: string;
}>;

type Match = ReturnType<typeof createEpisodeMatcher>['match'];

type PageResult = Readonly<{
  sync: StoredSync;
  /** An entry older than the cut-off: nothing further to read */
  reachedEnd: boolean;
}>;

const writeMatches = async (
  { reader, service, userId }: Run,
  sync: StoredSync,
  items: ReadonlyArray<ImportBatch[number]>,
  afterBatch?: (from: number, count: number) => Promise<unknown>,
): Promise<Pick<StoredSync, 'skipped' | 'written'>> => {
  let { skipped, written } = sync;
  let from = 0;
  for (const batch of chunk(items, WRITE_BATCH)) {
    const result = await writeWatchedBatch(
      userId,
      syncTag(service, sync.chainId),
      batch,
      { countOwnWrites: true, watchProvider: reader.watchProvider },
    );
    written += result.written;
    skipped += result.skipped;
    await afterBatch?.(from, batch.length);
    from += batch.length;
  }
  return { skipped, written };
};

/**
 * A catalogue failure throws, so the page is read again later rather than
 * an entry kept as "not found". A page read again counts once.
 * Accepted limit: pages count by position, so a history that grew between a
 * failed run and its resume can count some entries twice.
 */
const syncEntries = async (
  run: Run,
  sync: StoredSync,
  entries: ReadonlyArray<HistoryEntry>,
  match: Match,
  now: number,
): Promise<PageResult | 'stale'> => {
  let { films, newest, unresolved, unresolvedOverflow } = sync;
  let reachedEnd = false;
  const toWrite: ImportBatch[number][] = [];

  for (const entry of entries) {
    if (sync.stopBefore !== null && entry.watchedAt < sync.stopBefore) {
      reachedEnd = true;
      break;
    }
    newest = Math.max(newest ?? 0, entry.watchedAt);
    const { row } = entry;
    if (!row) {
      films += 1;
      continue;
    }
    const result = await match(row);
    if (result.kind === 'matched') {
      // The batch write sets the service on every item
      toWrite.push(importItemOf(result, row.watchedAt, now));
      continue;
    }
    const added = await addUnresolved(
      run.userId,
      run.service,
      sync,
      {
        key: entry.key,
        problem: result.problem,
        row: { episode: row.episode, season: row.season, title: row.title },
        watchedAt: entry.watchedAt,
      },
      now,
    );
    if (added === 'stale') {
      return 'stale';
    }
    if (added === 'added') {
      unresolved += 1;
    } else if (added === 'full') {
      unresolvedOverflow += 1;
    }
  }

  // Not held to the claim: Disconnect keeps what was synced, so a page
  // landing just after it is as one landing just before
  const counts = await writeMatches(run, sync, toWrite);

  return {
    reachedEnd,
    sync: {
      ...sync,
      ...counts,
      films,
      newest,
      page: sync.page + 1,
      strikes: 0,
      unresolved,
      unresolvedOverflow,
    },
  };
};

const ERROR_OF: Readonly<
  Record<Exclude<ReadFailureReason, 'unavailable'>, ConnectionSyncError>
> = {
  changed: 'changed',
  'profile-changed': 'profile-changed',
  'read-failed': 'failed',
  'signed-out': 'signed-out',
};

/** Where in the run a step is: the history's page it reads, or the review re-check */
const stepOf = (sync: StoredSync) =>
  sync.recheckFrom === undefined ? `page ${sync.page}` : 'review';

/**
 * One line per run for Logs Insights. A changed service logs as an error so
 * it stands out: its reader needs work. Never a session, cookie or entry.
 */
const logRunEnd = (
  { reader, service, userId }: Run,
  sync: StoredSync,
  error: ConnectionSyncError | null,
  step: string,
  now = Date.now(),
) => {
  const line = JSON.stringify({
    durationMs: now - sync.requestedAt,
    films: sync.films,
    invalid: sync.invalid,
    msg: `[${reader.label}] run ${error ? 'failed' : 'done'}`,
    outcome: error ? 'failed' : 'done',
    pages: sync.page,
    reason: error,
    runId: sync.runId,
    service,
    skipped: sync.skipped,
    step,
    strikes: sync.strikes,
    unresolved: sync.unresolved,
    unresolvedOverflow: sync.unresolvedOverflow,
    userId,
    written: sync.written,
  });
  if (error === 'changed') {
    console.error(line);
  } else if (error) {
    console.warn(line);
  } else {
    console.log(line);
  }
};

/** Fails the run as `error`: `failed`, or `stale` once it lost its claim */
const fail = async (
  run: Run,
  sync: StoredSync,
  error: ConnectionSyncError,
  step = stepOf(sync),
): Promise<SyncOutcome> => {
  if (!(await failSync(run.userId, run.service, sync, error))) {
    return 'stale';
  }
  logRunEnd(run, sync, error, step);
  return 'failed';
};

/** A busy service or TMDB failure: tried again later; the third in a row fails the run, keeping its checkpoint */
const strike = async (
  run: Run,
  sync: StoredSync,
  failAs: ConnectionSyncError,
  retryAfterSeconds?: number,
): Promise<SyncOutcome> => {
  const strikes = sync.strikes + 1;
  if (strikes >= MAX_STRIKES) {
    return fail(run, sync, failAs);
  }
  const later = Math.min(
    retryAfterSeconds ?? RETRY_DELAY_SECONDS,
    MAX_DELAY_SECONDS,
  );
  return (await checkpointSync(run.userId, run.service, { ...sync, strikes }))
    ? { later }
    : 'stale';
};

const onReadFailure = (
  run: Run,
  sync: StoredSync,
  { reason, retryAfterSeconds }: ReadFailure,
  step = stepOf(sync),
): Promise<SyncOutcome> =>
  reason === 'unavailable'
    ? strike(run, sync, 'rate-limited', retryAfterSeconds)
    : fail(run, sync, ERROR_OF[reason], step);

const open = async (
  run: Run,
  sync: StoredSync,
  connection: Connection,
): Promise<HistorySession | SyncOutcome> => {
  const { reader, service, userId } = run;
  let stored: string;
  try {
    stored = await decryptSecret(userId, service, connection.secret);
  } catch (error) {
    console.error(
      `[${reader.label}] could not open the session | User: ${userId}`,
      error,
    );
    return fail(run, sync, 'failed', 'open');
  }
  const opened = await reader.open(stored, connection.profileId);
  if (!opened.ok) {
    return onReadFailure(run, sync, opened, 'open');
  }
  const { session } = opened;
  if (
    session.secret !== stored &&
    !(await keepSecret(run, sync, session.secret))
  ) {
    return 'stale';
  }
  return session;
};

/**
 * A service may renew its cookies on any read (Prime Video on every one) and
 * refuse the old ones next time, so this runs after opening and each page.
 */
const keepSecret = async (
  { service, userId }: Run,
  sync: StoredSync,
  secret: string,
): Promise<boolean> =>
  saveRenewedSecret(
    userId,
    service,
    sync.runId,
    await encryptSecret(userId, service, secret),
  );

const readHistory = async (
  run: Run,
  connection: Connection,
  start: StoredSync,
  match: Match,
  hasTime: () => boolean,
  deps: SyncDeps,
): Promise<StoredSync | SyncOutcome | 'continue'> => {
  const { reader, service, userId } = run;
  let sync = start;
  const session = await open(run, sync, connection);
  if (isOutcome(session)) {
    return session;
  }
  let kept = session.secret;
  while (hasTime()) {
    const read = await session.readPage(sync.page, {
      from: sync.cursor,
      hasTime,
    });
    if (session.secret !== kept) {
      if (!(await keepSecret(run, sync, session.secret))) {
        return 'stale';
      }
      kept = session.secret;
    }
    if (!read.ok) {
      return onReadFailure(run, sync, read);
    }
    if ('walking' in read) {
      // Out of time on the way to the page: the next step walks on from here
      return (await checkpointSync(userId, service, {
        ...sync,
        cursor: read.walking,
      }))
        ? 'continue'
        : 'stale';
    }
    const { entries, invalid, more = false } = read.page;
    if (entries.length === 0 && invalid > 0 && !more) {
      return onReadFailure(run, sync, readFailure('changed'));
    }
    if (invalid > 0) {
      console.warn(
        `[${reader.label}] ${invalid} entries left out (outside the known shape, or not to be looked up now) | User: ${userId} | Page: ${sync.page}`,
      );
    }
    if (entries.length === 0 && !more) {
      return { ...sync, recheckFrom: null };
    }
    let result: PageResult | 'stale';
    try {
      result = await syncEntries(run, sync, entries, match, Date.now());
    } catch (error) {
      // Read the page again later: no entry is kept as "not found" for a
      // catalogue outage
      console.error(
        `[${reader.label}] page ${sync.page} failed | User: ${userId}`,
        error,
      );
      return strike(run, sync, 'failed');
    }
    if (result === 'stale') {
      return 'stale';
    }
    // The page and its cursor move on together
    sync = {
      ...result.sync,
      cursor: read.next,
      invalid: result.sync.invalid + invalid,
    };
    if (result.reachedEnd) {
      return { ...sync, recheckFrom: null };
    }
    if (!(await checkpointSync(userId, service, sync))) {
      return 'stale';
    }
    await deps.pause();
  }
  return 'continue';
};

/** Open review entries re-matched per page of the re-check */
const RECHECK_PAGE = 25;

/** A catalogue failure throws, closing nothing */
const recheckPage = async (
  run: Run,
  sync: StoredSync,
  entries: ReadonlyArray<OpenEntry>,
  match: Match,
  now: number,
): Promise<StoredSync> => {
  const { service, userId } = run;
  const toWrite: Array<Readonly<{ item: ImportBatch[number]; key: string }>> =
    [];
  const unusable: string[] = [];
  for (const entry of entries) {
    if (entry.chainId === sync.chainId) {
      continue;
    }
    if (!namesEpisode(entry.row)) {
      unusable.push(entry.key);
      continue;
    }
    const result = await match(entry.row);
    if (result.kind === 'matched') {
      toWrite.push({
        item: importItemOf(result, entry.watchedAt, now),
        key: entry.key,
      });
    }
  }
  const counts = await writeMatches(
    run,
    sync,
    toWrite.map(({ item }) => item),
    (from, count) =>
      closeUnresolved(
        userId,
        service,
        toWrite.slice(from, from + count).map(({ key }) => key),
        'resolvedAt',
        now,
      ),
  );
  await closeUnresolved(userId, service, unusable, 'dismissedAt', now);
  return { ...sync, ...counts, strikes: 0 };
};

const finish = async (
  run: Run,
  connection: Connection,
  sync: StoredSync,
  recheckedWith?: number,
): Promise<SyncOutcome> => {
  const finished = { ...sync, recheckFrom: undefined };
  if (
    !(await finishSync(
      run.userId,
      run.service,
      finished,
      connection.syncedThrough,
      recheckedWith,
    ))
  ) {
    return 'stale';
  }
  logRunEnd(run, finished, null, 'end');
  return 'done';
};

/**
 * Re-matches the review list so entries an older matcher couldn't settle are
 * written once it can. Once per `MATCHER_VERSION`: today's matcher already
 * read every entry kept since its last re-check.
 */
const recheckReview = async (
  run: Run,
  connection: Connection,
  start: StoredSync,
  match: Match,
  hasTime: () => boolean,
): Promise<SyncOutcome | 'continue'> => {
  const { reader, service, userId } = run;
  if (connection.recheckedWith === MATCHER_VERSION) {
    return finish(run, connection, start);
  }
  let sync = start;
  while (hasTime()) {
    const { entries, nextCursor } = await openEntriesAfter(
      userId,
      service,
      sync.recheckFrom ?? null,
      RECHECK_PAGE,
    );
    try {
      sync = await recheckPage(run, sync, entries, match, Date.now());
    } catch (error) {
      console.error(
        `[${reader.label}] review re-check failed | User: ${userId}`,
        error,
      );
      return strike(run, sync, 'failed');
    }
    if (nextCursor === null) {
      return finish(run, connection, sync, MATCHER_VERSION);
    }
    sync = { ...sync, recheckFrom: nextCursor };
    if (!(await checkpointSync(userId, service, sync))) {
      return 'stale';
    }
  }
  return (await checkpointSync(userId, service, sync)) ? 'continue' : 'stale';
};

/** Only the run that holds the claim (`runId`) does anything */
export const runSync = async (
  { runId, service, userId }: ConnectionSyncMessage,
  hasTime: () => boolean,
  overrides: Partial<SyncDeps> = {},
): Promise<SyncOutcome | 'continue'> => {
  const deps = { ...defaultDeps, ...overrides };
  const connection = await getConnection(userId, service);
  const sync = connection?.sync;
  if (
    !connection ||
    !sync ||
    sync.runId !== runId ||
    sync.state === 'ok' ||
    sync.state === 'failed'
  ) {
    return 'stale';
  }
  const run: Run = { reader: deps.readerOf(service), service, userId };
  const { match } = createEpisodeMatcher(deps.catalog);
  const read =
    sync.recheckFrom === undefined
      ? await asBrowser(connection.userAgent, () =>
          readHistory(run, connection, sync, match, hasTime, deps),
        )
      : sync;
  if (isOutcome(read)) {
    return read;
  }
  return recheckReview(run, connection, read, match, hasTime);
};
