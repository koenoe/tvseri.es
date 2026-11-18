import type { TasteSplitGenre } from '@tvseri.es/schemas';

import { formatGrouped } from '@/lib/formatCount';
import { landingPathFor } from '@/lib/routing/landingPath';

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
  /** The genre's landing */
  href: string;
  /** The row link's name: "Animation: juno has 41 series, you have 0" */
  label: string;
  /** Theirs, then yours */
  sides: readonly [SplitSide, SplitSide];
}>;

const splitRow = (
  side: TasteSplitGenre,
  username: string,
  lead: 'theirs' | 'yours',
): SplitRow | undefined => {
  // A row is a link: a genre without a landing has none
  const href = landingPathFor('genre', side.genreId);
  if (!href) {
    return undefined;
  }
  const scale = Math.max(side.ownerCount, side.viewerCount);
  const share = (count: number) => (scale === 0 ? 0 : count / scale);
  const theirs = formatGrouped(side.ownerCount);
  const yours = formatGrouped(side.viewerCount);
  return {
    genre: side.genre,
    href,
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
export const theirRow = (
  side: TasteSplitGenre,
  username: string,
): SplitRow | undefined => splitRow(side, username, 'theirs');

/** Your genre: the one you watch and they (almost) don't */
export const yourRow = (
  side: TasteSplitGenre,
  username: string,
): SplitRow | undefined => splitRow(side, username, 'yours');
