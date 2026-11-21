'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { useCallback, useOptimistic, useState, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import { SAVE_FAILED } from '@/lib/actions/saveFailed';
import { updateWatchProviders } from './actions';
import { createSaveLedger } from './saveLedger';
import {
  servicesReducer,
  type ToggleAction,
  toggleAction,
  type WatchProviderAction,
} from './servicesReducer';

const inverse = (action: ToggleAction): ToggleAction => ({
  provider: action.provider,
  type: action.type === 'add' ? 'remove' : 'add',
});

const titleOf = ({ provider, type }: ToggleAction) =>
  `${type === 'add' ? 'Added' : 'Removed'} ${provider.name}`;

/**
 * The viewer's services with one-tap saving: the tile changes in the same
 * frame (`useOptimistic`), the action saves the whole list, and the toast
 * offers Undo ("Added Netflix"). Quick taps each send the list with
 * all of them; the tiles settle on the latest list the server took
 * (`createSaveLedger`), so a failed save next to a later successful one
 * shows what the server has. `undo: false` leaves out the "Added Netflix"
 * toast (Get started, where the chip itself says it); a failed save always
 * says so. A reorder (a drag or the Move menu) saves the same way without a
 * toast: the tile is where it was dropped, and dragging back undoes it.
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
    (action: WatchProviderAction, toastFor: ToggleAction | null) => {
      const { seq, value: list } = ledger.want((wanted) =>
        servicesReducer(wanted, action),
      );
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
      if (toastFor && undo) {
        showToast({
          action: {
            label: 'Undo',
            onClick: () => apply(inverse(toastFor), null),
          },
          title: titleOf(toastFor),
        });
      }
    },
    [applyOptimistic, ledger, undo],
  );

  const toggle = useCallback(
    (provider: WatchProvider) => {
      const action = toggleAction(ledger.wanted, provider);
      apply(action, action);
    },
    [apply, ledger],
  );

  /** The services in this order (ids); the order they're in: nothing */
  const reorder = useCallback(
    (order: ReadonlyArray<number>) => {
      const action = { order, type: 'reorder' } as const;
      if (servicesReducer(ledger.wanted, action) !== ledger.wanted) {
        apply(action, null);
      }
    },
    [apply, ledger],
  );

  return { reorder, selected, toggle };
}
