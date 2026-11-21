'use client';

import { regionName } from '@tvseri.es/utils';
import { useCallback, useOptimistic, useState, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import { SAVE_FAILED } from '@/lib/actions/saveFailed';
import { refreshRegion } from '@/lib/region/useRegion';
import { updateCountry } from '@/lib/watchProviders/actions';
import { createSaveLedger } from '@/lib/watchProviders/saveLedger';

/**
 * The saved region with one-tap saving: picking a country changes the card at
 * once, saves `PUT /me { country }` and toasts "Region: Netherlands" with
 * Undo. The new region's services arrive with the refreshed page. Quick
 * picks settle on the latest one the server took (`createSaveLedger`), so a
 * late or failed older save never overrides a newer pick.
 */
export function useRegion(initial: string) {
  const [ledger] = useState(() => createSaveLedger(initial));
  const [committed, setCommitted] = useState(initial);
  const [region, setOptimistic] = useOptimistic(committed);
  const [, startSaving] = useTransition();

  const choose = useCallback(
    (code: string, announce: boolean) => {
      const previous = ledger.wanted;
      if (code === previous) {
        return;
      }
      const { seq } = ledger.want(() => code);
      startSaving(async () => {
        setOptimistic(code);
        // A thrown action (offline, a server error) is a failed save too:
        // the ledger must still settle it
        const ok = await updateCountry(code)
          .then((result) => result.ok)
          .catch(() => false);
        if (ok) {
          // Discover's "Streaming in …" line: replace the browser's day-long copy
          void refreshRegion();
        } else {
          showToast({ title: SAVE_FAILED, tone: 'error' });
        }
        setCommitted(ledger.settle(seq, ok));
      });
      if (announce) {
        showToast({
          action: { label: 'Undo', onClick: () => choose(previous, false) },
          title: `Region: ${regionName(code)}`,
        });
      }
    },
    [ledger, setOptimistic],
  );

  return { choose, region };
}
