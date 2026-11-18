'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import { ERROR_MESSAGE } from './copy';
import { useEnsureSeries } from './hooks';

/** A seed that hasn't landed by then has failed (`useEnsureSeries` swallows errors) */
export const SEED_TIMEOUT_MS = 8000;

type Queued = Readonly<{
  action: () => unknown;
  onFail?: () => void;
  /** settles `run`'s promise with what the action returned */
  done: (result: unknown) => void;
}>;

/**
 * Marking commands need the show seeded in the marking store. A row on the
 * profile isn't (that would be one `/api/me/series/:id` call per row on every
 * load), so the show is fetched on intent (pointer over it, focus, touch)
 * and a click that comes before the seed runs as soon as it lands. (The
 * controls on cached pages get ready through `useShowActions().prepare`
 * instead, and their press waits for the seed without drawing anything.)
 *
 * `pending` is true while such a click waits, so the control can draw
 * itself pressed at once. If the seed doesn't land, the click is dropped
 * with the shared error toast, `onFail` lets the control undo what it drew,
 * and the next intent fetches again. `run` resolves with the action's result
 * (a command's write, for `pressMark`), or nothing when it was dropped.
 *
 * @example
 * const { intent, pending, run } = useIntentSeed(seriesId);
 * <button aria-pressed={pending} onPointerEnter={intent} onClick={() => run(() => toggle())} />
 */
export default function useIntentSeed(seriesId: number) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const view = useEnsureSeries(seriesId, armed);
  const queued = useRef<Queued | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // The one place that has to wait for the store: run the queued click once
  // the seed lands (no event fires then)
  useEffect(() => {
    if (view && queued.current) {
      const { action, done } = queued.current;
      queued.current = null;
      stopTimer();
      setPending(false);
      done(action());
    }
  }, [view, stopTimer]);

  useEffect(() => stopTimer, [stopTimer]);

  const intent = useCallback(() => setArmed(true), []);

  const fail = useCallback(() => {
    const dropped = queued.current;
    queued.current = null;
    timer.current = null;
    setPending(false);
    setArmed(false);
    dropped?.onFail?.();
    dropped?.done(undefined);
    showToast({ title: ERROR_MESSAGE, tone: 'error' });
  }, []);

  const run = useCallback(
    (action: () => unknown, onFail?: () => void): Promise<unknown> => {
      if (view) {
        return Promise.resolve(action());
      }
      // a newer click replaces one still waiting: that one is dropped
      queued.current?.done(undefined);
      let done: (result: unknown) => void = () => {};
      const promise = new Promise<unknown>((resolve) => {
        done = resolve;
      });
      queued.current = { action, done, onFail };
      setPending(true);
      setArmed(true);
      stopTimer();
      timer.current = setTimeout(fail, SEED_TIMEOUT_MS);
      return promise;
    },
    [view, fail, stopTimer],
  );

  return { intent, isSeeded: view !== undefined, pending, run } as const;
}
