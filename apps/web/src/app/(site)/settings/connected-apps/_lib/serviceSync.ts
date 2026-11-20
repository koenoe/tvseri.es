import type { ConnectionStatus, ConnectionSyncError } from '@tvseri.es/schemas';
import { formatGrouped } from '@tvseri.es/utils';

import type { ConnectedService } from '../../_lib/services/types';

/**
 * A service card's sync row: what the last (or running) sync did, in one
 * line. Pure, so the copy is tested without rendering the card.
 */

type Sync = ConnectionStatus['sync'];

/**
 * A sync is waiting for its job or reading the service: the card keeps
 * refreshing. A run the API calls stalled (quiet past its stale limit) is
 * over: the card stops asking and Sync now may start the next.
 */
export const isSyncing = (sync: Sync): boolean =>
  (sync?.state === 'queued' || sync?.state === 'running') && !sync.stalled;

/**
 * The wait before the next status poll, `elapsed` ms after the sync was
 * asked for: most end within a minute, so often then, every 30s after.
 */
export const pollDelay = (elapsed: number): number =>
  elapsed < 60_000 ? 5000 : 30_000;

/**
 * What of a sync the card draws, as one string: a poll whose sync differs
 * from the one on screen means the page has something new to show.
 */
export const syncFingerprint = (sync: Sync): string =>
  sync === null
    ? 'none'
    : [
        sync.requestedAt,
        sync.state,
        sync.stalled,
        sync.error,
        sync.written,
        sync.skipped,
        sync.films,
        sync.unresolved,
        sync.unresolvedOverflow,
      ].join('|');

const FAILED = 'The last sync didn’t finish.';

/** Why a sync failed, in words the viewer can act on */
const failedLine = (
  service: ConnectedService,
  error: ConnectionSyncError,
): string =>
  error === 'failed' ? FAILED : (service.copy.syncFailed[error] ?? FAILED);

/**
 * One count in the line: its number (null for "No new episodes") and the
 * words after it, so the card can roll the number on its own.
 */
export type SyncCount = Readonly<{
  count: number | null;
  key: 'films' | 'review' | 'skipped' | 'written';
  words: string;
}>;

/** A sync's line: its words (a run's state), then its counts */
export type SyncLine = Readonly<{
  counts: ReadonlyArray<SyncCount>;
  lead: string | null;
}>;

const wordsFor = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

/**
 * "37 new episodes · 1,203 already watched · 4 films skipped · 2 to
 * review", leaving out what didn't happen. `toReview` is the review list as
 * it stands; without it, what the run added.
 */
function countsOf(
  sync: NonNullable<Sync>,
  toReview: number,
): ReadonlyArray<SyncCount> {
  const counts: SyncCount[] = [
    sync.written === 0
      ? { count: null, key: 'written', words: 'No new episodes' }
      : {
          count: sync.written,
          key: 'written',
          words: wordsFor(sync.written, 'new episode', 'new episodes'),
        },
  ];
  if (sync.skipped > 0) {
    counts.push({
      count: sync.skipped,
      key: 'skipped',
      words: 'already watched',
    });
  }
  if (sync.films > 0) {
    counts.push({
      count: sync.films,
      key: 'films',
      words: wordsFor(sync.films, 'film skipped', 'films skipped'),
    });
  }
  if (toReview > 0) {
    counts.push({ count: toReview, key: 'review', words: 'to review' });
  }
  return counts;
}

/** A running sync's counts so far: only once it has counted something */
const runningCounts = (sync: NonNullable<Sync>): ReadonlyArray<SyncCount> =>
  sync.written > 0 || sync.skipped > 0
    ? countsOf({ ...sync, films: 0 }, 0)
    : [];

const lineOf = (lead: string): SyncLine => ({ counts: [], lead });

/**
 * The sync row's line; `reconnecting` while the card's reconnect block says
 * the service signed the link out, so the row doesn't say it again.
 */
export function syncLine(
  service: ConnectedService,
  sync: Sync,
  reconnecting = false,
  toReview?: number,
): SyncLine {
  if (!sync) {
    return lineOf('No sync has run yet.');
  }
  if (sync.stalled) {
    return lineOf(
      'The last sync stopped before it finished. The next one picks up where it stopped.',
    );
  }
  switch (sync.state) {
    case 'queued':
      return lineOf('Sync queued. It starts in a moment.');
    case 'running':
      return { counts: runningCounts(sync), lead: service.copy.syncRunning };
    case 'failed':
      if (reconnecting && sync.error === 'signed-out') {
        return lineOf('');
      }
      return lineOf(failedLine(service, sync.error ?? 'failed'));
    case 'ok':
      return {
        counts: countsOf(
          sync,
          toReview ?? sync.unresolved + sync.unresolvedOverflow,
        ),
        lead: null,
      };
  }
}

/** A count in words: "1,203 already watched" */
const countText = ({ count, words }: SyncCount): string =>
  count === null ? words : `${formatGrouped(count)} ${words}`;

/** The sync line as one string (what a screen reader hears) */
export function syncResultLine(
  service: ConnectedService,
  sync: Sync,
  reconnecting = false,
  toReview?: number,
): string {
  const { counts, lead } = syncLine(service, sync, reconnecting, toReview);
  return [lead, ...counts.map(countText)].filter(Boolean).join(' · ');
}
