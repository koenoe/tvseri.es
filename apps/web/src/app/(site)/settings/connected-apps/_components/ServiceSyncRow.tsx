'use client';

import type { ConnectionStatus } from '@tvseri.es/schemas';
import { AnimatePresence } from 'motion/react';
import { useCallback, useState, useTransition } from 'react';

import FoldPresence from '@/components/motion/FoldPresence';
import RollingNumber from '@/components/motion/RollingNumber';
import Button from '@/components/ui/button/Button';
import { refreshGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';

import LocalMoment from '../../_components/LocalMoment';
import { MD_BUTTON } from '../../_lib/appButtons';
import { appErrorText } from '../_lib/appState';
import {
  isSyncing,
  type SyncLine,
  syncLine,
  syncResultLine,
} from '../_lib/serviceSync';
import { defaultSince, type SyncScopeChoice } from '../_lib/syncScope';
import { syncConnection } from '../actions';
import FlashTarget from './motion/NeedsYouFlash';
import OptionRow from './OptionRow';
import { useReviewCount } from './reviewCount';
import { useConnectedService } from './ServiceContext';
import ServiceScopeRow from './ServiceScopeRow';
import useSyncRefresh from './useSyncRefresh';

/**
 * Queues a run now: the first sync, or an admin's (canSyncNow). `scope`
 * (the first sync's How far back) becomes the request's `since`.
 */
function SyncNow({
  scope,
  syncing,
}: Readonly<{
  scope: (() => SyncScopeChoice) | null;
  syncing: boolean;
}>) {
  const { id, name } = useConnectedService();
  const [pending, startTransition] = useTransition();
  const sync = useCallback(
    () =>
      startTransition(async () => {
        const chosen = scope?.();
        const body =
          chosen === undefined
            ? undefined
            : { since: chosen.kind === 'since' ? chosen.since : null };
        const result = await syncConnection(id, body);
        if (!result.ok) {
          showToast({ title: appErrorText(name)[result.error], tone: 'error' });
        }
      }),
    [id, name, scope],
  );
  // A running sync shows as the button's pending ring: one press is enough
  const busy = pending || syncing;
  return (
    <Button
      className={MD_BUTTON}
      icon={refreshGlyph}
      onClick={sync}
      pending={busy}
      variant="tonal"
    >
      Sync now
    </Button>
  );
}

/**
 * The line as drawn: its words, then each count rolling to its new value
 * (a running sync's, at each poll). Hidden from screen readers, which hear
 * the status region beside it instead.
 */
function SyncLineText({ line }: Readonly<{ line: SyncLine }>) {
  return (
    <span aria-hidden="true" className="block">
      {line.lead}
      {line.counts.map(({ count, key, words }, index) => (
        <span key={key}>
          {index > 0 || line.lead ? ' · ' : null}
          {count === null ? null : (
            <>
              <RollingNumber value={count} />{' '}
            </>
          )}
          {words}
        </span>
      ))}
    </span>
  );
}

/**
 * The scope row folds out with its own gap: it draws the gap under it
 * (`pb-4`) and takes the parent's back (`-mb-4`), so nothing jumps when it
 * has gone.
 */
const SCOPE_FOLD = '-mb-4';
const SCOPE_GAP = 'pb-4';

/**
 * The card's Sync row: when the last sync ran, what it did (or why it
 * failed, or that one is running, with its counts so far) and Sync now when
 * allowed. While a sync runs the card refreshes itself and its counts roll.
 * The result is a status region, so a screen reader hears it change; a
 * running sync's counts stay out of it, or every poll would be read out.
 * "How far back" folds away once the first sync is asked for, and the Last
 * sync line folds in when it has finished.
 */
export default function ServiceSyncRow({
  syncNow,
  lastSyncedAt,
  reconnecting = false,
  resumeFrom = null,
  sync,
  toReview,
  total = null,
}: Readonly<{
  syncNow: boolean;
  lastSyncedAt: number | null;
  /** The reconnect block above already says the service signed the link out */
  reconnecting?: boolean;
  /** Where the last connection's sync reached: the default day */
  resumeFrom?: number | null;
  sync: ConnectionStatus['sync'];
  /** The review list's open entries, as the server counted them */
  toReview?: number;
  /** The history's length, for Everything's line */
  total?: number | null;
}>) {
  const service = useConnectedService();
  const syncing = isSyncing(sync);
  // Only a first sync not yet started asks how far back
  const asks = syncNow && lastSyncedAt === null && sync === null;
  const [scope, setScope] = useState<SyncScopeChoice | null>(null);
  const chosenScope = useCallback(
    (): SyncScopeChoice =>
      scope ?? { kind: 'since', since: defaultSince(Date.now(), resumeFrom) },
    [resumeFrom, scope],
  );
  useSyncRefresh(service.id, sync);
  // The list below as it stands (fixes before the server has them), else
  // the server's count; never what the run left, which goes stale
  const live = useReviewCount(service.id);
  const reviewCount =
    live ??
    (toReview === undefined
      ? undefined
      : toReview + (sync?.unresolvedOverflow ?? 0));
  const line = syncLine(service, sync, reconnecting, reviewCount);
  const spoken = syncing
    ? (line.lead ?? '')
    : syncResultLine(service, sync, reconnecting, reviewCount);
  const description = (
    <>
      <AnimatePresence initial={false}>
        {lastSyncedAt === null ? null : (
          <FoldPresence as="span" key="last">
            <LocalMoment at={lastSyncedAt} prefix="Last sync " style="at" />
          </FoldPresence>
        )}
      </AnimatePresence>
      <span className="sr-only" role="status">
        {spoken}
      </span>
      <SyncLineText line={line} />
    </>
  );
  return (
    <>
      <AnimatePresence initial={false}>
        {asks ? (
          <FoldPresence className={SCOPE_FOLD} key="scope">
            <div className={SCOPE_GAP}>
              <ServiceScopeRow
                resumeFrom={resumeFrom}
                scope={scope}
                setScope={setScope}
                total={total}
              />
            </div>
          </FoldPresence>
        ) : null}
      </AnimatePresence>
      <OptionRow control="beside" description={description} title="Sync">
        {syncNow ? (
          // A first sync still to start is why the card opened on its own:
          // its one flash goes round Sync now
          <FlashTarget>
            <SyncNow scope={asks ? chosenScope : null} syncing={syncing} />
          </FlashTarget>
        ) : null}
      </OptionRow>
    </>
  );
}
