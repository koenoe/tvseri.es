import { isSeasonComplete, isStillComing, seriesProgress } from './progress';
import type { SeriesBase } from './types';

/**
 * What one of the viewer's own marks completed in this tab: the whole show
 * (`finished`), and the regular seasons that now read "Watched". The show
 * page plays its one beat for it (the line's sheen, the season line's
 * sweep); nothing else writes it, so a seed, an Undo or a sync never plays.
 */
export type Culmination = Readonly<{
  /** A new one each time (a finish, an unmark, a finish again plays twice) */
  key: number;
  seriesId: number;
  finished: boolean;
  seasons: ReadonlyArray<number>;
}>;

/** Finished as the eye and the lists have it, and nothing more to come */
const isFinishedForGood = (view: SeriesBase) =>
  seriesProgress(view).isFinished && !isStillComing(view);

/** Is `scope` (the whole show, or a season by number) complete in `view`? */
export const isComplete = (
  view: SeriesBase | undefined,
  scope: 'show' | number,
): boolean =>
  view !== undefined &&
  (scope === 'show' ? isFinishedForGood(view) : isSeasonComplete(view, scope));

/**
 * What the change from `prior` to `next` completed: null when nothing
 * flipped to done. A caught-up show that still airs isn't finished, and a
 * season with episodes still to air isn't complete.
 */
export function culminationOf(
  prior: SeriesBase,
  next: SeriesBase,
): Omit<Culmination, 'key'> | null {
  const completed = (scope: 'show' | number) =>
    isComplete(next, scope) && !isComplete(prior, scope);
  const finished = completed('show');
  const seasons = next.seasons
    .map((season) => season.seasonNumber)
    .filter(completed);
  if (!finished && seasons.length === 0) {
    return null;
  }
  return { finished, seasons, seriesId: next.seriesId };
}
