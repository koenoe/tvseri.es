'use client';

import { UsernameSchema } from '@tvseri.es/schemas';
import { useCallback, useRef, useState } from 'react';
import * as v from 'valibot';

import { fetchJson } from '@/lib/series/useCachedJson';

import type { UsernameAvailability } from './usernameHint';

const DEBOUNCE_MS = 300;

type Answer = Readonly<{
  status: 'available' | 'taken';
  username: string;
}>;

const checkUrl = (username: string) =>
  `/api/me/username-check?username=${encodeURIComponent(username)}`;

/**
 * Availability of the username being typed: asks the server 300 ms after the
 * last keystroke, and only for a new username the slug rule accepts (the
 * saved one is never checked). A new keystroke cancels the check in flight,
 * so a late answer for an older draft never replaces a newer one. `forDraft`
 * is the answer for the draft, or `unknown` while it is stale or pending.
 * `markTaken` records a 409 from Save.
 */
export function useUsernameAvailability(saved: string) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<AbortController | null>(null);

  const onDraft = useCallback(
    (username: string) => {
      clearTimeout(timer.current);
      inFlight.current?.abort();
      inFlight.current = null;
      if (username === saved || !v.is(UsernameSchema, username)) {
        return;
      }
      timer.current = setTimeout(async () => {
        const controller = new AbortController();
        inFlight.current = controller;
        try {
          const { status } = await fetchJson<Pick<Answer, 'status'>>(
            checkUrl(username),
            { signal: controller.signal },
          );
          if (!controller.signal.aborted) {
            setAnswer({ status, username });
          }
        } catch {
          // No answer: the hint stays unknown and Save still checks.
        }
      }, DEBOUNCE_MS);
    },
    [saved],
  );

  const markTaken = useCallback((username: string) => {
    setAnswer({ status: 'taken', username });
  }, []);

  const forDraft = (draft: string): UsernameAvailability =>
    answer?.username === draft ? answer.status : 'unknown';

  return { forDraft, markTaken, onDraft };
}
