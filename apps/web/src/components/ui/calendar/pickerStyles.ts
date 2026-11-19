import cn from '@/lib/cn';

/**
 * The date pickers' parts: marking an episode's day and a sync's first day
 * share them.
 */

/** 11px uppercase label. */
export const DIALOG_LABEL = 'block text-overline text-white/60 uppercase';

/** A choice in a picker's left column */
export const PICKER_OPTION = cn(
  'relative flex h-11 cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-12 bg-white/5 px-3 text-left text-body-sm font-medium text-white transition-[background-color,box-shadow] duration-150 hover:bg-white/10',
  'aria-pressed:bg-white/12 aria-pressed:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)]',
);

/** A quick date: on phones two columns, the date right under the label */
export const PICKER_QUICK = cn(
  PICKER_OPTION,
  // the lines' own leading is the space between them, 10px above and below
  'max-sm:h-auto max-sm:flex-col max-sm:items-start max-sm:justify-center max-sm:gap-0 max-sm:py-2.5 max-sm:leading-5',
);

/** The quick dates' column (two columns on phones) */
export const PICKER_QUICK_GROUP =
  'mb-3 flex flex-col gap-1.5 max-sm:mb-2 max-sm:grid max-sm:grid-cols-2 max-sm:gap-2';

/** A quick date's day, beside its label (under it on phones) */
export const PICKER_HINT =
  'whitespace-nowrap text-meta text-white/60 max-sm:leading-[18px]';

/** The dialog's body: the choices beside the month grid, stacked on phones */
export const PICKER_BODY =
  'grid grid-cols-[216px_minmax(0,1fr)] items-start gap-5 max-sm:grid-cols-1 max-sm:gap-4.5';
