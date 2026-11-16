'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import { updateSeriesPrefs } from '@/lib/marking/actions';
import { ERROR_MESSAGE } from '@/lib/marking/copy';

import {
  answerPaused,
  type PausedChoice,
} from '../../../_lib/marking/setPaused';

/**
 * The lane's answers: a show leaves at once, goes through the marking core's
 * `updateSeriesPrefs`, and comes back with the shared error toast if the API
 * refuses. After a Hide the page refreshes so Up next and In progress drop
 * the show too.
 */
export default function usePausedAnswers() {
  const [answered, setAnswered] = useState<ReadonlySet<number>>(new Set());
  const [, startTransition] = useTransition();
  const router = useRouter();

  const answer = (ids: ReadonlyArray<number>, choice: PausedChoice) => {
    setAnswered((previous) => new Set([...previous, ...ids]));
    startTransition(async () => {
      const result = await answerPaused(ids, choice, updateSeriesPrefs);
      const taken = new Set(result.done);
      if (choice === 'hide' && taken.size > 0) {
        router.refresh();
      }
      if (result.ok) {
        return;
      }
      setAnswered((previous) => {
        const next = new Set(previous);
        for (const id of ids) {
          if (!taken.has(id)) {
            next.delete(id);
          }
        }
        return next;
      });
      showToast({ title: ERROR_MESSAGE, tone: 'error' });
    });
  };

  return { answer, answered } as const;
}
