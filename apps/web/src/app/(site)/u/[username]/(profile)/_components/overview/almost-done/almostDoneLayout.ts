import type {
  LaneRowGhostLayout,
  LaneRowLayout,
} from '@/components/lane-row/laneRowLayout';
import { SEGMENT_CLASS } from '@/components/ui/progress/Segments';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { LANE_ROW } from '../../blocks/Lane';
import { LANE_ROW_GHOST } from '../../blocks/LaneGhost';

/*
 * Almost done's rows on the shared lane row. Each place keeps its own look on purpose; don't unify them.
 */

/** The poster's box (its ghost takes the same) */
export const ALMOST_DONE_POSTER = 'aspect-2/3 w-12 shrink-0 rounded-6';

/** The poster's frame: the box, a fill behind the art, its shadow */
export const ALMOST_DONE_POSTER_FRAME = cn(
  'relative block overflow-hidden bg-white/8 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.8)]',
  ALMOST_DONE_POSTER,
);

/** "1 to go": beside the title from md, in the meta line on a phone */
const TO_GO =
  'shrink-0 whitespace-nowrap text-caption tabular-nums text-white/60';

export const ALMOST_DONE_ROW: LaneRowLayout = {
  code: 'lane',
  count: cn(TO_GO, 'max-md:hidden'),
  countInMeta: cn(TO_GO, 'md:hidden'),
  meta: 'gap-2.5',
  metaFit: 'drop',
  row: LANE_ROW,
  // title line, segments, meta line: 10px apart
  text: 'flex min-w-0 flex-1 flex-col gap-2.5',
  title: 'min-w-0 truncate text-body-sm font-semibold hover:underline',
  titleLine: 'flex items-baseline justify-between gap-2.5',
};

export const ALMOST_DONE_ROW_GHOST: LaneRowGhostLayout = {
  row: LANE_ROW_GHOST,
  segment: cn('block', GHOST_FILL, SEGMENT_CLASS),
};
