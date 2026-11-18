import 'server-only';

import { hasEnoughPosters } from '@tvseri.es/constants';

import {
  type DurationTileShow,
  getDurationTiles,
  getFinishThisWeekend,
} from '@/app/(site)/_discover/data/duration';
import { getGoDeeper } from '@/app/(site)/_discover/data/goDeeper';

import {
  idsOf,
  withoutShown,
} from '@/app/(site)/_discover/landing/neverRepeat';
import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

import { backdropShowOf } from './lensModel';
import { getAllTimeFavourites } from './rows';

const SHOWN = 4;

/**
 * Finish it this weekend's shows: ended, under 6 hours, none of them in the
 * Go deeper cards just above (adjacent sections never show
 * the same shows), not the show the Duration lens's Under 6 hours tile draws
 * as its backdrop (the same image twice, one screen apart), none of the
 * numbered All-time favourites below (a ranked list can't skip a rank, so
 * this row gives way), and none at all under `MIN_POSTERS`. Go deeper, the
 * tiles or the favourites unavailable leave the weekend row as it is (none is cached here: the section renders with
 * the page; each read is cached on its own).
 */
export async function getWeekendShows(): Promise<
  ReadonlyArray<DurationTileShow> | Unavailable
> {
  const [shows, goDeeper, tiles, favourites] = await Promise.all([
    getFinishThisWeekend(),
    getGoDeeper(),
    getDurationTiles(),
    getAllTimeFavourites(),
  ]);
  if (isUnavailable(shows)) {
    return shows;
  }
  const cards = isUnavailable(goDeeper) ? [] : goDeeper.cards;
  const underSix = isUnavailable(tiles)
    ? undefined
    : tiles.find((tile) => tile.bucket === 'under-6-hours');
  const tileShow = underSix ? backdropShowOf(underSix.preview) : undefined;
  const above = idsOf(
    ...cards.map((card) => card.items),
    tileShow ? [tileShow] : [],
    isUnavailable(favourites) ? [] : favourites,
  );
  const kept = withoutShown(shows, above).slice(0, SHOWN);
  // under three the section steps aside, and the row below needn't avoid it
  return hasEnoughPosters(kept.length) ? kept : [];
}
