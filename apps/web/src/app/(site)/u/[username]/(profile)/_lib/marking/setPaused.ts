import type { UpdateSeriesPrefs } from '@tvseri.es/schemas';
import * as v from 'valibot';

import type { ActionResult } from '@/lib/actions/result';

/**
 * "Still watching?" (Paused): Keep or Hide, written as the per-show pref
 * `paused` through the marking core's `updateSeriesPrefs` server action (the
 * core's one write path for prefs; the proxy refreshes the session, Next
 * runs actions one at a time). The core has no command for `paused`, and it
 * is frozen for page streams, so the profile adds this one. Nothing in the
 * marking store depends on `paused` (it holds no pref of that name), so
 * there is nothing to apply there: the lane answers at once itself and
 * rolls back on the shared error toast.
 */

export type PausedChoice = 'keep' | 'hide';

/** The most shows one answer sends (a row answers one; Hide all is the bulk hide) */
export const MAX_PAUSED = 20;

const PausedIdsSchema = v.pipe(
  v.array(v.pipe(v.number(), v.integer(), v.minValue(1))),
  v.maxLength(MAX_PAUSED),
);

type Update = (
  seriesId: number,
  patch: UpdateSeriesPrefs,
) => Promise<ActionResult<unknown>>;

export type PausedAnswer = Readonly<{
  /** The shows the API took; the rest go back to the lane */
  done: ReadonlyArray<number>;
  ok: boolean;
}>;

/**
 * One request per show, one after the other (a Hide all of 20 is 20 short
 * requests, never a burst). Invalid or too many ids send nothing.
 */
export async function answerPaused(
  seriesIds: ReadonlyArray<number>,
  choice: PausedChoice,
  update: Update,
): Promise<PausedAnswer> {
  const ids = v.safeParse(PausedIdsSchema, seriesIds);
  if (!ids.success) {
    return { done: [], ok: false };
  }
  const done: number[] = [];
  for (const id of ids.output) {
    const result = await update(id, { paused: choice }).catch(() => null);
    if (result?.ok) {
      done.push(id);
    }
  }
  return { done, ok: done.length === ids.output.length };
}
