import cn from '@/lib/cn';

import { HIT_ALL } from './hitArea';
import type { PosterCircleLook } from './PosterCircle';

/*
 * Each place keeps its own look on purpose; don't unify them. Both share
 * the press (0.96) and a 40px target around the 32px circle.
 */

const PRESS =
  'transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-96';
/** 40px to the pointer; a bordered circle reaches 2px further (its reach starts inside the border) */
const PRESS_AND_REACH = `${PRESS} ${HIT_ALL[4]}`;
const PRESS_AND_REACH_BORDERED = `${PRESS} ${HIT_ALL[6]}`;

/** A round action in a Library poster's top right corner: an inset ring; on, only the glyph changes */
const LIBRARY_CIRCLE = `absolute top-2 right-2 z-2 flex size-8 items-center justify-center rounded-full bg-[rgb(15_20_20/0.6)] text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.28)] hover:bg-[rgb(15_20_20/0.8)] ${PRESS_AND_REACH}`;

export const LIBRARY_POSTER_CIRCLE: PosterCircleLook = {
  off: LIBRARY_CIRCLE,
  on: LIBRARY_CIRCLE,
};

/** Stats' Popular unwatched: a 2px border on a light ground; on, a solid white disc */
const STATS_CIRCLE = `absolute top-2 right-2 flex size-8 items-center justify-center rounded-full border-2 border-white/22 bg-[rgba(15,20,20,0.35)] text-white hover:border-white/50 ${PRESS_AND_REACH_BORDERED}`;

export const STATS_POSTER_CIRCLE: PosterCircleLook = {
  off: cn(STATS_CIRCLE),
  on: cn(STATS_CIRCLE, 'border-white bg-white text-black hover:border-white'),
};
