import { genreName, landingSlugForId } from '@tvseri.es/constants';

/**
 * Genre names without a call to `/genres` (for a genre landing's title and a
 * meta line's genre): the names of the genre landings, TMDB's own for its
 * genres (`genreName` in @tvseri.es/constants).
 */

/** "Crime" for `crime`, "Horror" for `horror`; undefined for a slug that isn't a genre landing */
export const genreNameBySlug = (slug: string): string | undefined =>
  genreName(slug);

/** "Sci-Fi & Fantasy" for TMDB genre 10765; undefined for an unknown id */
export function genreNameById(id: number): string | undefined {
  const slug = landingSlugForId('genre', id);
  return slug ? genreName(slug) : undefined;
}
