'use client';

import { useOptimistic, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import { PLEX_ERROR_TEXT } from '../_lib/plexCopy';
import { updatePlex } from '../actions';

type Settings = Readonly<{ onlyAccountId: number | null; paused: boolean }>;

/**
 * Pause and whose plays count, saved the moment they change: the card shows
 * the new value in the same frame, and snaps back with a toast if the API
 * says no. Pause says so with an Undo.
 */
export default function usePlexSettings(saved: Settings) {
  const [settings, setSettings] = useOptimistic(
    saved,
    (current, patch: Partial<Settings>): Settings => ({ ...current, ...patch }),
  );
  const [, startTransition] = useTransition();

  const save = (patch: Partial<Settings>, onSaved?: () => void) => {
    startTransition(async () => {
      setSettings(patch);
      const result = await updatePlex(patch);
      if (!result.ok) {
        showToast({ title: PLEX_ERROR_TEXT[result.error], tone: 'error' });
        return;
      }
      onSaved?.();
    });
  };

  const setPaused = (paused: boolean) => {
    const undo = () => save({ paused: !paused });
    save({ paused }, () =>
      showToast({
        action: { label: 'Undo', onClick: undo },
        title: paused ? 'Scrobbling paused' : 'Scrobbling resumed',
      }),
    );
  };

  const setOnlyAccountId = (onlyAccountId: number | null) =>
    save({ onlyAccountId });

  return { ...settings, setOnlyAccountId, setPaused };
}
