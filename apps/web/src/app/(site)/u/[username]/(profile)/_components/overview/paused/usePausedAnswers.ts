'use client';

import { BULK_LIBRARY_MAX } from '@tvseri.es/schemas';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import { updateSeriesPrefs } from '@/lib/marking/actions';
import { ERROR_MESSAGE } from '@/lib/marking/copy';
import useBulk from '@/lib/marking/useBulk';

import {
  answerPaused,
  type PausedChoice,
} from '../../../_lib/marking/setPaused';

const without = (
  set: ReadonlySet<number>,
  ids: ReadonlyArray<number>,
): ReadonlySet<number> => {
  const next = new Set(set);
  for (const id of ids) {
    next.delete(id);
  }
  return next;
};

/**
 * The lane's answers: a show leaves without waiting for the API (its row
 * folds out), goes through the marking core's `updateSeriesPrefs`, and
 * comes back with the shared error toast if the API refuses. Hide all is
 * the Library's bulk hide (one server action, the toast with Undo, as a
 * row's Hide has; at most `BULK_LIBRARY_MAX` shows a press, the rest stay
 * for the next). After a Hide the page refreshes so Up next and In
 * progress drop the shows too.
 */
export default function usePausedAnswers() {
  const [answered, setAnswered] = useState<ReadonlySet<number>>(new Set());
  const [, startTransition] = useTransition();
  const router = useRouter();
  const bulk = useBulk();

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
      setAnswered((previous) =>
        without(
          previous,
          ids.filter((id) => !taken.has(id)),
        ),
      );
      showToast({ title: ERROR_MESSAGE, tone: 'error' });
    });
  };

  /** Hides up to `BULK_LIBRARY_MAX` of the shows; the ones it took */
  const hideAll = (all: ReadonlyArray<number>): ReadonlyArray<number> => {
    const ids = all.slice(0, BULK_LIBRARY_MAX);
    setAnswered((previous) => new Set([...previous, ...ids]));
    // Undo brings the shows back into the lane, and the page reads them again
    const onUndone = () => {
      setAnswered((previous) => without(previous, ids));
      router.refresh();
    };
    startTransition(async () => {
      const { done, failed } = await bulk(
        'hide',
        ids.map((id) => ({ id })),
        { onUndone },
      );
      if (failed.length > 0) {
        setAnswered((previous) => without(previous, failed));
      }
      if (done.length > 0) {
        router.refresh();
      }
    });
    return ids;
  };

  return { answer, answered, hideAll } as const;
}
