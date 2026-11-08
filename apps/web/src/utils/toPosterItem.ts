import type { TvSeries } from '@tvseri.es/schemas';

/**
 * The fields a poster tile reads. Map list items to this before they cross
 * into client components (or into a `use cache` entry) so the RSC payload
 * doesn't carry the full series.
 */
export type PosterItem = Readonly<
  Pick<TvSeries, 'id' | 'posterImage' | 'slug' | 'title'>
>;

export const toPosterItem = ({
  id,
  posterImage,
  slug,
  title,
}: PosterItem): PosterItem => ({ id, posterImage, slug, title });
