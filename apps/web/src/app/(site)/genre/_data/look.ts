import 'server-only';

import { landingFilter } from '@tvseri.es/constants';

import { isUnavailable } from '@/lib/cache/unavailable';
import { getDiscoverShows } from '../../_discover/data/discover';
import { getLandingColour } from '../../_discover/data/leadColour';
import {
  GENRE_FALLBACK,
  type LandingLook,
  landingLook,
} from '../../_discover/landing/landingLook';
import { bestInGenreQuery } from './rows';

/**
 * A genre's candidate shows for its colour, lead first: the best rated that
 * TMDB files under this genre first (Breaking Bad is Drama first, so Crime
 * starts from its own), then the rest of The 50 best's first page, whose
 * order moves slowly: stable between visits, and two genres rarely share a
 * lead. A genre TMDB only has as a keyword (`genreId` undefined) keeps the
 * best rated order.
 */
export function genreCandidates(
  shows: ReadonlyArray<
    Readonly<{ id: number; genreIds: ReadonlyArray<number> }>
  >,
  genreId: number | undefined,
): ReadonlyArray<number> {
  const own = shows.filter((show) => show.genreIds[0] === genreId);
  const rest = shows.filter((show) => show.genreIds[0] !== genreId);
  return [...own, ...rest].map((show) => show.id);
}

/**
 * A genre landing's ground and glow, from its candidates (`genreCandidates`).
 * No cache scope of its own: it derives from cached reads, whose lives
 * (`unavailable` after an outage) set the page's; an outer scope would cap
 * them at Next's 15-minute default, or pin a fallback with its own profile.
 */
export async function genreLook(slug: string): Promise<LandingLook> {
  const best = await getDiscoverShows(bestInGenreQuery(slug));
  if (isUnavailable(best)) {
    return GENRE_FALLBACK;
  }
  const genreId =
    Number(landingFilter('genre', slug)?.with_genres) || undefined;
  const colour = await getLandingColour(genreCandidates(best.items, genreId));
  return landingLook(colour, GENRE_FALLBACK);
}
