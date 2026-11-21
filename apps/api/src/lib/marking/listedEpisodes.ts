import { parseEpisodeCode } from '@tvseri.es/schemas';

import { readShow } from '@/lib/catalogue';
import { seasonsForMark } from './catalog';

/**
 * The codes of episodes TMDB lists for a show, in the order given: each is
 * looked up in its season's real episode list (the copy the season marks
 * store, specials included), never inferred from counts, so a season
 * numbered on across seasons or with a gap is checked as TMDB has it. A
 * show or season TMDB doesn't know lists none. Throws when TMDB fails with
 * nothing stored: a skip is refused, never silently dropped.
 */
export const listedEpisodeCodes = async <Code extends string>(
  seriesId: number,
  codes: ReadonlyArray<Code>,
): Promise<Code[]> => {
  const refs = codes.map((code) => ({ code, ref: parseEpisodeCode(code) }));
  // Only the show's own seasons are fetched: codes for seasons it doesn't
  // have (S000…S999 in a crafted request) would each cost TMDB a read and
  // store a null
  const series = await readShow(seriesId, 'mark');
  const own = new Set([
    ...(series?.seasons ?? []).map((season) => season.seasonNumber),
    ...(series?.specials ? [0] : []),
  ]);
  const seasons = await seasonsForMark(
    seriesId,
    refs.flatMap(({ ref }) =>
      ref && own.has(ref.seasonNumber) ? [ref.seasonNumber] : [],
    ),
  );
  return refs
    .filter(
      ({ ref }) =>
        ref !== null &&
        (seasons
          .get(ref.seasonNumber)
          ?.episodes.some(
            (episode) => episode.episodeNumber === ref.episodeNumber,
          ) ??
          false),
    )
    .map(({ code }) => code);
};
