import type { WatchProvider } from '@tvseri.es/schemas';

import { type Fold, foldOf } from '@/lib/fold';

/** How many unselected services show before "Show all N". */
const VISIBLE_RESTING = 7;

export type Rest = Readonly<{
  /** A filter is typed: every match shows. */
  filtering: boolean;
  /**
   * Where Show all / Show fewer is offered (the app's fold rule, `lib/fold`:
   * more than 3 hidden, 2 on a phone); `none` while filtering.
   */
  fold: Fold;
  /** The tiles to render (all of them when only a phone folds). */
  tiles: ReadonlyArray<WatchProvider>;
  /** Folded on phones only: tiles past the first 7 hide there (CSS). */
  phoneFolded: boolean;
  /** Unselected services before the 7-cap. */
  total: number;
}>;

/**
 * The "Popular in …" card's tiles: the region's services in TMDB display
 * order, minus the ones already selected, narrowed by the filter, capped at 7
 * until "Show all" where the fold rule folds them.
 */
export function restOf({
  providers,
  query,
  selected,
  showAll,
}: Readonly<{
  providers: ReadonlyArray<WatchProvider>;
  query: string;
  selected: ReadonlyArray<WatchProvider>;
  showAll: boolean;
}>): Rest {
  const needle = query.trim().toLowerCase();
  const taken = new Set(selected.map((p) => p.id));
  const matching = providers.filter(
    (p) =>
      !taken.has(p.id) && (!needle || p.name.toLowerCase().includes(needle)),
  );
  const filtering = needle !== '';
  const fold = filtering ? 'none' : foldOf(matching.length - VISIBLE_RESTING);
  const capped = fold === 'all' && !showAll;
  return {
    filtering,
    fold,
    phoneFolded: fold === 'phone' && !showAll,
    tiles: capped ? matching.slice(0, VISIBLE_RESTING) : matching,
    total: matching.length,
  };
}

/** Countries whose English name takes "the". */
const WITH_THE = new Set(['AE', 'GB', 'NL', 'PH', 'US']);

/** The card's title: "Popular in the United Kingdom" or "Matching “sky”". */
export function popularLabel(
  regionName: string,
  regionCode: string,
  query: string,
): string {
  const typed = query.trim();
  if (typed) {
    return `Matching “${typed}”`;
  }
  return `Popular in ${WITH_THE.has(regionCode) ? 'the ' : ''}${regionName}`;
}
