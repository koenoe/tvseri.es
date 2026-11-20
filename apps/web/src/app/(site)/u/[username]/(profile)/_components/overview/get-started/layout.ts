/**
 * Get started's layout classes and static copy, shared by the card's client
 * parts and its placeholder (`GetStartedGhost`, a server module).
 */

export const GET_STARTED_SECTION = 'flex scroll-mt-6 flex-col gap-4';
export const GET_STARTED_INTRO = '-mt-3 text-body-sm text-white/60';
/** Concentric round its steps: their 12px corners plus the 18px padding */
export const GET_STARTED_STEPS =
  'flex flex-col gap-2 rounded-[30px] bg-black/22 p-[18px]';

/**
 * The head's "0 of 3 done" and its three-part bar: on a small phone the bar
 * gives up width so the head stays inside the column
 */
export const PROGRESS = 'flex min-w-0 items-center gap-3';
export const PROGRESS_BAR = 'w-24 min-w-0';

/** One step: the circle, then its title, line and controls */
export const STEP_ROW =
  'grid grid-cols-[32px_minmax(0,1fr)] gap-4 rounded-12 bg-white/4 p-4';
export const STEP_CIRCLE = 'size-8 rounded-full';
export const STEP_TEXT = 'flex min-w-0 flex-col gap-1.5';
export const STEP_TITLE = 'm-0 text-body font-semibold';
export const STEP_LINE = 'mt-0.5 mb-2 text-caption text-white/60';

/** Step 1's chips and step 3's links: 32px pills that wrap */
export const PILL_ROW = 'flex flex-wrap gap-2';
/** A link pill: its outline a 2px inner ring (a picked chip's border is its state) */
export const HISTORY_PILL =
  'inline-flex h-8 items-center gap-2 rounded-full pr-4 pl-3 text-caption font-medium text-white/80 shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)] transition-shadow hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)]';

/** Step 2's posters: a row of eight on desktop, two of four on a phone */
export const SEEN_GRID = 'grid grid-cols-4 gap-2.5 sm:grid-cols-8';
export const SEEN_POSTER = 'aspect-2/3 rounded-8';

export const INTRO =
  'Three steps and this page runs itself: what’s out, what’s next and what’s coming.';

export const STEPS = [
  {
    line: 'Coming up and suggestions only show what you can watch.',
    title: 'Your services',
  },
  {
    line: 'Seen series go to Finished and stay out of your suggestions.',
    title: 'Already seen',
  },
  {
    line: 'Years of episodes in one go, or every episode you finish on Plex.',
    title: 'Your history elsewhere',
  },
] as const;
