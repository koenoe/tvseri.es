'use client';

import type { ConnectionStatus } from '@tvseri.es/schemas';
import { useCallback, useState, useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { refreshGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';

import LocalMoment from '../../_components/LocalMoment';
import { MD_BUTTON } from '../../_lib/appButtons';
import { appErrorText } from '../_lib/appState';
import { isSyncing, syncResultLine } from '../_lib/serviceSync';
import { defaultSince, type SyncScopeChoice } from '../_lib/syncScope';
import { syncConnection } from '../actions';
import OptionRow from './OptionRow';
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
 * The card's Sync row: when the last sync ran, what it did (or why it
 * failed, or that one is running) and Sync now when allowed. While a sync
 * runs the card refreshes itself; the result line is a status region, so a
 * screen reader hears it change.
 */
export default function ServiceSyncRow({
  syncNow,
  lastSyncedAt,
  reconnecting = false,
  resumeFrom = null,
  sync,
  total = null,
}: Readonly<{
  syncNow: boolean;
  lastSyncedAt: number | null;
  /** The reconnect block above already says the service signed the link out */
  reconnecting?: boolean;
  /** Where the last connection's sync reached: the default day */
  resumeFrom?: number | null;
  sync: ConnectionStatus['sync'];
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
  const when =
    lastSyncedAt === null ? null : (
      <LocalMoment at={lastSyncedAt} prefix="Last sync " style="at" />
    );
  const description = (
    <>
      {when}
      <span className="block" role="status">
        {syncResultLine(service, sync, reconnecting)}
      </span>
    </>
  );
  return (
    <>
      {asks ? (
        <ServiceScopeRow
          resumeFrom={resumeFrom}
          scope={scope}
          setScope={setScope}
          total={total}
        />
      ) : null}
      <OptionRow description={description} title="Sync">
        {syncNow ? (
          <SyncNow scope={asks ? chosenScope : null} syncing={syncing} />
        ) : null}
      </OptionRow>
    </>
  );
}
