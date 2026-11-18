import type { TvSeries } from '@tvseri.es/schemas';

import type { ControlStatesRead } from '@/lib/marking/controlState';

import PickCard from './PickCard';
import type { PickCardItem } from './PickDeck';
import { pickMeta, pickWhy } from './pickWhy';

type Props = Readonly<{
  /**
   * the day's seven, then a reserve (cached, the same for everyone): the
   * viewer is dealt from it on the client (`dealPick`)
   */
  pool: ReadonlyArray<TvSeries>;
  /** `YYYY-MM-DD` the why lines are written for (the page's day) */
  day: string;
  /** the viewer's states (the page's one read): the result's Watchlist */
  states?: ControlStatesRead;
}>;

/**
 * "Can't decide? Let us pick":
 * the pinned moment after Top Picks. The lines are written here on the
 * server, so the client island only gets the few fields it draws and the
 * first pick (the pool's first card) renders the same on both sides.
 */
export default function PickOneForMe({ day, pool, states }: Props) {
  const cards: ReadonlyArray<PickCardItem> = pool.map((series) => ({
    ...pickMeta(series),
    id: series.id,
    poster: series.posterImage,
    slug: series.slug,
    title: series.title,
    why: pickWhy(series, day),
  }));
  return <PickCard pool={cards} states={states} />;
}
