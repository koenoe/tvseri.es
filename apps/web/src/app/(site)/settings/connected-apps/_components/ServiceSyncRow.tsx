'use client';

import type { ConnectionStatus } from '@tvseri.es/schemas';
import { useCallback, useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { refreshGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';

import LocalMoment from '../../_components/LocalMoment';
import { MD_BUTTON } from '../../_lib/appButtons';
import { appErrorText } from '../_lib/appState';
import { isSyncing, syncResultLine } from '../_lib/serviceSync';
import { syncConnection } from '../actions';
import OptionRow from './OptionRow';
import { useConnectedService } from './ServiceContext';
import useSyncRefresh from './useSyncRefresh';

/** Queues a run now: the first sync, or an admin's (canSyncNow). */
function SyncNow({ syncing }: Readonly<{ syncing: boolean }>) {
  const { id, name } = useConnectedService();
  const [pending, startTransition] = useTransition();
  const sync = useCallback(
    () =>
      startTransition(async () => {
        const result = await syncConnection(id);
        if (!result.ok) {
          showToast({ title: appErrorText(name)[result.error], tone: 'error' });
        }
      }),
    [id, name],
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
  sync,
}: Readonly<{
  syncNow: boolean;
  lastSyncedAt: number | null;
  /** The reconnect block above already says the service signed the link out */
  reconnecting?: boolean;
  sync: ConnectionStatus['sync'];
}>) {
  const service = useConnectedService();
  const syncing = isSyncing(sync);
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
    <OptionRow description={description} title="Sync">
      {syncNow ? <SyncNow syncing={syncing} /> : null}
    </OptionRow>
  );
}
