/**
 * Stats count regular episodes only: specials (season 0) can be marked on
 * the show page but never add to the year segments, the years list, the
 * spotlight or the all-time count and runtime, as progress, Next up and
 * Finished already leave them out.
 */
export const countsInStats = (item: Readonly<{ seasonNumber: number }>) =>
  item.seasonNumber > 0;
