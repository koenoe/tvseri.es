'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { useCallback, useOptimistic, useState, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';

import { updateWatchProviders } from '../../_actions/services';
import { SAVE_FAILED } from '../../_lib/saveFailed';
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
 * shows what the server has.
 */
export function useSelectedServices(initial: ReadonlyArray<WatchProvider>) {
  const [ledger] = useState(() => createSaveLedger(initial));
  const [committed, setCommitted] = useState(initial);
  const [selected, applyOptimistic] = useOptimistic(committed, servicesReducer);
  const [, startSaving] = useTransition();

  const apply = useCallback(
    (action: WatchProviderAction, announce: boolean) => {
      const { list, seq } = ledger.want(action);
      startSaving(async () => {
        applyOptimistic(action);
        const result = await updateWatchProviders({
          watchProviders: [...list],
        });
        if (!result.ok) {
          showToast({ title: SAVE_FAILED, tone: 'error' });
        }
        setCommitted(ledger.settle(seq, result.ok));
      });
      if (announce) {
        showToast({
          action: {
            label: 'Undo',
            onClick: () => apply(inverse(action), false),
          },
          title: titleOf(action),
        });
      }
    },
    [applyOptimistic, ledger],
  );

  const toggle = useCallback(
    (provider: WatchProvider) =>
      apply(toggleAction(ledger.wanted, provider), true),
    [apply, ledger],
  );

  return { selected, toggle };
}
