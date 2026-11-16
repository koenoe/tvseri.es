import cn from '@/lib/cn';

import type { PosterCircleLook } from './PosterCircle';

/*
 * Each place keeps its signed-off look (owner, 15 Nov 2026); unify only with
 * his approval.
 */

/** A round action in a Library poster's top right corner (`.tadd`): an inset ring; on, only the glyph changes */
const LIBRARY_CIRCLE =
  'absolute top-2 right-2 z-2 flex size-8 items-center justify-center rounded-full bg-[rgb(15_20_20/0.6)] text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.28)] transition-colors hover:bg-[rgb(15_20_20/0.8)]';

export const LIBRARY_POSTER_CIRCLE: PosterCircleLook = {
  off: LIBRARY_CIRCLE,
  on: LIBRARY_CIRCLE,
};

/** Stats' Popular unwatched (`.st-add`): a 2px border on a light ground; on, a solid white disc */
const STATS_CIRCLE =
  'absolute top-2 right-2 flex size-8 items-center justify-center rounded-full border-2 border-white/22 bg-[rgba(15,20,20,0.35)] text-white hover:border-white/50';

export const STATS_POSTER_CIRCLE: PosterCircleLook = {
  off: cn(STATS_CIRCLE),
  on: cn(STATS_CIRCLE, 'border-white bg-white text-black hover:border-white'),
};
