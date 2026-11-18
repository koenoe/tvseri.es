import type { DurationTileShow } from '@/app/(site)/_discover/data/duration';
import type { TileShow } from '@/app/(site)/_discover/data/tileShow';

/**
 * A poster in the hub's rows: title, year and at most one more fact. The
 * in-place lens rows name the network; Essentials shows the year alone (no
 * score under a poster: the product's rating is the star and a score out of
 * ten, `lib/format/rating`, and only where a row is about the score).
 */
export type HubShow = Readonly<{
  id: number;
  slug: string;
  title: string;
  poster: string | null;
  year: number | null;
  /** '' for none: the caption is the year alone */
  fact: string;
  factGlyph: 'network' | null;
}>;

export const withNetwork = (show: TileShow | DurationTileShow): HubShow => ({
  fact: show.network ?? '',
  factGlyph: 'network',
  id: show.id,
  poster: show.poster,
  slug: show.slug,
  title: show.title,
  year: show.year,
});

export const withYear = (show: TileShow): HubShow => ({
  fact: '',
  factGlyph: null,
  id: show.id,
  poster: show.poster,
  slug: show.slug,
  title: show.title,
  year: show.year,
});
