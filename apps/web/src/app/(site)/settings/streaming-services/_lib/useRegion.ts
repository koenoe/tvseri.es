'use client';

import { regionName } from '@tvseri.es/utils';
import {
  useCallback,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import { SAVE_FAILED } from '@/lib/actions/saveFailed';
import { refreshRegion } from '@/lib/region/useRegion';
import { updateCountry } from '@/lib/watchProviders/actions';

/**
 * The saved region with one-tap saving: picking a country changes the card at
 * once, saves `PUT /me { country }` and toasts "Region: Netherlands" with
 * Undo. The new region's services arrive with the refreshed page.
 */
export function useRegion(initial: string) {
  const [committed, setCommitted] = useState(initial);
  const [region, setOptimistic] = useOptimistic(committed);
  const [, startSaving] = useTransition();
  const current = useRef(initial);

  const choose = useCallback(
    (code: string, announce: boolean) => {
      const previous = current.current;
      if (code === previous) {
        return;
      }
      current.current = code;
      startSaving(async () => {
        setOptimistic(code);
        const result = await updateCountry(code);
        if (result.ok) {
          setCommitted(code);
          // Discover's "Streaming in …" line: replace the browser's day-long copy
          void refreshRegion();
        } else {
          current.current = previous;
          showToast({ title: SAVE_FAILED, tone: 'error' });
        }
      });
      if (announce) {
        showToast({
          action: { label: 'Undo', onClick: () => choose(previous, false) },
          title: `Region: ${regionName(code)}`,
        });
      }
    },
    [setOptimistic],
  );

  return { choose, region };
}
