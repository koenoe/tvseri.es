import { PULSE } from '@/components/ui/ghost/ghosts';

/** How one place draws the lane panel and its head */
export type LaneLook = Readonly<{
  /** The count pill's additions to `Badge variant="count"` */
  count: string;
  /** The placeholder panel's additions (its pulse) */
  ghost: string;
  head: string;
  heading: 'h2' | 'h3';
  panel: string;
  title: string;
}>;

/*
 * Each place keeps its own look on purpose; don't unify them.
 */

/**
 * Home's In progress lane beside the Up next card: a panel from md only (the
 * phone shows a bare row), the head for screen readers only on a phone. Its
 * placeholder sits in a grid that pulses as one layer.
 */
export const HOME_LANE: LaneLook = {
  count: '',
  ghost: '',
  head: 'flex items-center gap-2.5 px-0.5 pt-0.5 pb-1.5 max-md:sr-only',
  heading: 'h3',
  panel: 'flex flex-col gap-3 md:gap-2.5 md:rounded-16 md:bg-black/22 md:p-4.5',
  title: 'text-title-3 whitespace-nowrap text-white',
};

/** The profile's lanes: the head wraps on a phone so a link drops under the title */
export const PROFILE_LANE: LaneLook = {
  count: 'shrink-0',
  ghost: PULSE,
  head: 'flex flex-wrap items-center gap-x-2.5 gap-y-1 px-0.5 pt-0.5 pb-1.5 md:flex-nowrap',
  heading: 'h2',
  panel: 'flex flex-col gap-2.5 rounded-16 bg-black/22 p-[18px]',
  title: 'm-0 shrink-0 whitespace-nowrap text-title-3 text-white',
};

/** Stats' cards: a tighter head that never wraps */
export const STATS_LANE: LaneLook = {
  count: '',
  ghost: `overflow-hidden ${PULSE}`,
  head: 'flex items-center gap-2.5 px-0.5',
  heading: 'h2',
  panel: 'flex min-w-0 flex-col gap-2.5 rounded-16 bg-black/22 p-[18px]',
  title: 'text-title-3 whitespace-nowrap text-white',
};
