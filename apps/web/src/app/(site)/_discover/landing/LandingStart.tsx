import 'server-only';

import { isUnavailable } from '@/lib/cache/unavailable';

import { getWhereToStart, type StartFor } from '../data/whereToStart';
import { keptShows, type RowLoader } from './planRow';
import { WhereToStartSkeleton } from './skeletons';
import { keptSlots } from './startSlots';
import WhereToStart from './WhereToStart';

type Props = Readonly<{
  /** which landing the picks are for, as `getWhereToStart` */
  by: StartFor;
  /** the genre or theme slug, or the country code */
  value: string;
  /** Where to start's row in `loaders` */
  index: number;
  /** every row of the page, top to bottom (see `planRow`) */
  loaders: ReadonlyArray<RowLoader>;
}>;

/**
 * Where to start under the rows above it (Genre, Theme): the picks those
 * rows don't draw, in slot order (`keptSlots`). Its failed look when either
 * read is `Unavailable`. Put it in a `GuardedSection`.
 */
export default async function LandingStart({
  by,
  index,
  loaders,
  value,
}: Props) {
  const [picks, kept] = await Promise.all([
    getWhereToStart(by, value),
    keptShows(loaders, index),
  ]);
  if (isUnavailable(picks) || isUnavailable(kept)) {
    return <WhereToStartSkeleton look="failed" />;
  }
  const shown = keptSlots(picks, kept);
  return <WhereToStart id="start" picks={shown} />;
}
