/**
 * A tab's tiles arriving in place of another tab's (Discover's lens grids,
 * a landing row's switch): each fades up (opacity and an 8px rise, 450ms)
 * as it is inserted, only under a `data-fade` ancestor, which the caller
 * sets once the viewer switches: never on the first paint, where it would
 * hold back the page's largest paint. The old tab's tiles leave at once.
 * Reduced motion ends it at once (the global rule). For rails and grids of
 * tiles only: a tab that swaps one body of content (a dialog's chips, a
 * card's help lines) takes `SwapIn` (`swap.ts`), so every tab panel of a
 * kind moves the same way.
 */
export const TAB_ARRIVE =
  'transition-[opacity,translate] duration-450 ease-[cubic-bezier(0.2,0.8,0.2,1)] in-data-fade:starting:translate-y-2 in-data-fade:starting:opacity-0';
