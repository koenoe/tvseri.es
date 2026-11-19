'use client';

import type { ConnectionService, ConnectionStatus } from '@tvseri.es/schemas';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { isSyncing, syncFingerprint } from '../_lib/serviceSync';
import { watchSync } from './syncPoll';

/**
 * While a sync waits or runs, the card joins the page's one status poll
 * (`syncPoll.ts`), which refreshes the page only when the sync moves, not
 * every few seconds.
 */
export default function useSyncRefresh(
  service: ConnectionService,
  sync: ConnectionStatus['sync'],
) {
  const router = useRouter();
  const run = sync && isSyncing(sync) ? sync.requestedAt : null;
  const fingerprint = syncFingerprint(sync);
  // The poll is a subscription to a timer and the tab's visibility
  useEffect(() => {
    if (run === null) {
      return;
    }
    return watchSync(service, {
      fingerprint,
      refresh: () => router.refresh(),
      requestedAt: run,
    });
  }, [fingerprint, router, run, service]);
}
