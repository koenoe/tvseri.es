'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { useCallback, useOptimistic, useState, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import { SAVE_FAILED } from '@/lib/actions/saveFailed';
import { updateWatchProviders } from './actions';
import { createSaveLedger } from './saveLedger';
import {
  servicesReducer,
  toggleAction,
  type WatchProviderAction,
} from './servicesReducer';

const inverse = (action: WatchProviderAction): WatchProviderAction => ({
  provider: action.provider,
  type: action.type === 'add' ? 'remove' : 'add',
});

const titleOf = ({ provider, type }: WatchProviderAction) =>
  `${type === 'add' ? 'Added' : 'Removed'} ${provider.name}`;

/**
 * The viewer's services with one-tap saving: the tile changes in the same
 * frame (`useOptimistic`), the action saves the whole list, and the toast
 * offers Undo ("Added Netflix"). Quick taps each send the list with
 * all of them; the tiles settle on the latest list the server took
 * (`createSaveLedger`), so a failed save next to a later successful one
 * shows what the server has. `undo: false` leaves out the "Added Netflix"
 * toast (Get started, where the chip itself says it); a failed save always
 * says so.
 */
export function useSelectedServices(
  initial: ReadonlyArray<WatchProvider>,
  { undo = true }: Readonly<{ undo?: boolean }> = {},
) {
  const [ledger] = useState(() => createSaveLedger(initial));
  const [committed, setCommitted] = useState(initial);
  const [selected, applyOptimistic] = useOptimistic(committed, servicesReducer);
  const [, startSaving] = useTransition();

  const apply = useCallback(
    (action: WatchProviderAction, announce: boolean) => {
      const { list, seq } = ledger.want(action);
      startSaving(async () => {
        applyOptimistic(action);
        // A thrown action (offline, a server error) is a failed save too:
        // the ledger must still settle it
        const ok = await updateWatchProviders({ watchProviders: [...list] })
          .then((result) => result.ok)
          .catch(() => false);
        if (!ok) {
          showToast({ title: SAVE_FAILED, tone: 'error' });
        }
        setCommitted(ledger.settle(seq, ok));
      });
      if (announce && undo) {
        showToast({
          action: {
            label: 'Undo',
            onClick: () => apply(inverse(action), false),
          },
          title: titleOf(action),
        });
      }
    },
    [applyOptimistic, ledger, undo],
  );

  const toggle = useCallback(
    (provider: WatchProvider) =>
      apply(toggleAction(ledger.wanted, provider), true),
    [apply, ledger],
  );

  return { selected, toggle };
}
