import type { ConnectionStatus, ConnectionSyncError } from '@tvseri.es/schemas';
import { formatGrouped, plural } from '@tvseri.es/utils';

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

const counted = (count: number, what: string) =>
  `${formatGrouped(count)} ${what}`;

/** "37 new episodes · 1,203 already watched · 4 films skipped · 2 to review" */
function counts(sync: NonNullable<Sync>): string {
  const toReview = sync.unresolved + sync.unresolvedOverflow;
  return [
    sync.written === 0
      ? 'No new episodes'
      : plural(sync.written, 'new episode'),
    sync.skipped > 0 ? counted(sync.skipped, 'already watched') : null,
    sync.films > 0 ? `${plural(sync.films, 'film')} skipped` : null,
    toReview > 0 ? counted(toReview, 'to review') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The sync row's line; `reconnecting` while the card's reconnect block says
 * the service signed the link out, so the row doesn't say it again.
 */
export function syncResultLine(
  service: ConnectedService,
  sync: Sync,
  reconnecting = false,
): string {
  if (!sync) {
    return 'No sync has run yet.';
  }
  if (sync.stalled) {
    return 'The last sync stopped before it finished. The next one picks up where it stopped.';
  }
  switch (sync.state) {
    case 'queued':
      return 'Sync queued. It starts in a moment.';
    case 'running':
      return service.copy.syncRunning;
    case 'failed':
      if (reconnecting && sync.error === 'signed-out') {
        return '';
      }
      return failedLine(service, sync.error ?? 'failed');
    case 'ok':
      return counts(sync);
  }
}
