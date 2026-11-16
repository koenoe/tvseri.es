import type { TasteSplitGenre } from '@tvseri.es/schemas';

import { formatGrouped } from '@/lib/formatCount';

/**
 * `/genre/{slug}`: the landing's slug, as the API slugs TMDB's names
 * ("Sci-Fi & Fantasy" → `sci-fi-fantasy`)
 */
export const genreSlug = (genre: string): string =>
  genre
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** One person's line in a split row: the name, the bar and the count */
export type SplitSide = Readonly<{
  /** "juno" or "You" */
  name: string;
  /** "1,204" */
  count: string;
  /** The bar's length: the count over the larger of the two (0 to 1) */
  share: number;
  /** The person the row is about (the one with more): the brighter bar */
  lead: boolean;
}>;

export type SplitRow = Readonly<{
  genre: string;
  /** The row link's name: "Animation: juno has 41 series, you have 0" */
  label: string;
  /** Theirs, then yours */
  sides: readonly [SplitSide, SplitSide];
}>;

const splitRow = (
  side: TasteSplitGenre,
  username: string,
  lead: 'theirs' | 'yours',
): SplitRow => {
  const scale = Math.max(side.ownerCount, side.viewerCount);
  const share = (count: number) => (scale === 0 ? 0 : count / scale);
  const theirs = formatGrouped(side.ownerCount);
  const yours = formatGrouped(side.viewerCount);
  return {
    genre: side.genre,
    label: `${side.genre}: ${username} has ${theirs} series, you have ${yours}`,
    sides: [
      {
        count: theirs,
        lead: lead === 'theirs',
        name: username,
        share: share(side.ownerCount),
      },
      {
        count: yours,
        lead: lead === 'yours',
        name: 'You',
        share: share(side.viewerCount),
      },
    ],
  };
};

/** Their genre: the one they watch and you (almost) don't */
export const theirRow = (side: TasteSplitGenre, username: string): SplitRow =>
  splitRow(side, username, 'theirs');

/** Your genre: the one you watch and they (almost) don't */
export const yourRow = (side: TasteSplitGenre, username: string): SplitRow =>
  splitRow(side, username, 'yours');
