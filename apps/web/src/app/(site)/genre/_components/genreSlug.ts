import { notFound } from 'next/navigation';

import { genreNameBySlug } from '../../_discover/data/genreNames';

/**
 * A genre landing's name (a TMDB genre, or a genre TMDB only has as a
 * keyword); `notFound()` for a slug that isn't a genre landing.
 */
export function genreForSlug(slug: string): Readonly<{ name: string }> {
  const name = genreNameBySlug(slug);
  if (!name) {
    notFound();
  }
  return { name };
}
