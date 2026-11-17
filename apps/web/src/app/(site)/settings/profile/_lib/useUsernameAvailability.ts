'use client';

import { UsernameSchema } from '@tvseri.es/schemas';
import { useCallback, useRef, useState } from 'react';
import * as v from 'valibot';

import { checkUsername } from '../../_actions/profile';
import type { UsernameAvailability } from './usernameHint';

const DEBOUNCE_MS = 300;

type Answer = Readonly<{
  status: 'available' | 'taken';
  username: string;
}>;

/**
 * Availability of the username being typed: asks the server 300 ms after the
 * last keystroke, and only for a new username the slug rule accepts (the
 * saved one is never checked). `forDraft` is the answer for the draft, or
 * `unknown` while it is stale or pending. `markTaken` records a 409 from Save.
 */
export function useUsernameAvailability(saved: string) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onDraft = useCallback(
    (username: string) => {
      clearTimeout(timer.current);
      if (username === saved || !v.is(UsernameSchema, username)) {
        return;
      }
      timer.current = setTimeout(async () => {
        const result = await checkUsername(username);
        if (result.ok) {
          setAnswer({ status: result.data, username });
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
