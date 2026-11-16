import type { LibraryShelf } from '@tvseri.es/schemas';

import {
  bookmarkGlyph,
  completeGlyph,
  heartGlyph,
  hideGlyph,
  progressGlyph,
  showGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';

export type ShelfEmptyCopy = Readonly<{
  glyph: Glyph | ToggleGlyph;
  title: string;
  sub?: string;
}>;

/** Your own empty shelves */
export const OWNER_EMPTY: Readonly<Record<LibraryShelf, ShelfEmptyCopy>> = {
  all: {
    glyph: showGlyph,
    sub: 'Every series you mark, save or love lands here once.',
    title: 'Nothing here yet',
  },
  favourites: {
    glyph: heartGlyph,
    sub: 'The series you love lead your profile.',
    title: 'No favourites yet',
  },
  finished: {
    glyph: completeGlyph,
    sub: 'Series you watch to the end land here.',
    title: 'Nothing finished yet',
  },
  hidden: {
    glyph: hideGlyph,
    sub: 'Series you hide from in progress wait here until you bring them back.',
    title: 'Nothing hidden',
  },
  watching: {
    glyph: progressGlyph,
    sub: 'Start a series and it opens here.',
    title: 'Nothing in progress',
  },
  watchlist: {
    glyph: bookmarkGlyph,
    title: 'All clear. Everything you saved, you’ve started.',
  },
};
