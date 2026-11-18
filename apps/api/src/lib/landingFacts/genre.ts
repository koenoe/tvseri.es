import { allOf, isCappedCount, type LandingFilter } from '@tvseri.es/constants';
import type { GenreLandingFacts } from '@tvseri.es/schemas';
import { todayUtc } from '@tvseri.es/utils';
import {
  byCountThenId,
  type Counter,
  decadeFilters,
  genreShares,
  type Limited,
  MAX_CHIPS,
  MIN_SHOWS,
  rankThemes,
  themeCandidates,
} from './shared';

const toDate = (date: Date) => todayUtc(date.getTime());

/** The same day a year ago (a leap day becomes 1 March) */
const yearAgo = (today: Date) => {
  const date = new Date(today);
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date;
};

export const genreFacts = async ({
  count,
  filter,
  limited,
  slug,
  today,
}: Readonly<{
  count: Counter;
  filter: LandingFilter;
  limited: Limited;
  slug: string;
  today: Date;
}>): Promise<GenreLandingFacts> => {
  const total = await count(filter);
  const base = { alsoWith: [], byKind: [], count: total, newLastYear: 0 };

  if (total === 0) {
    return { ...base, peakDecade: null, slug, subGenres: [], type: 'genre' };
  }

  // a TMDB genre's own id; a genre TMDB keeps as a keyword has none
  const self = Number(filter.with_genres) || undefined;
  const [alsoWith, decades, newLastYear, subGenres] = await Promise.all([
    genreShares({ count, exceptId: self, filter, total }),
    Promise.all(
      decadeFilters(filter).map(async (decade) => ({
        count: await count(decade.filter),
        id: Number(decade.slug.slice(0, 4)),
        slug: decade.slug,
      })),
    ),
    count({
      ...filter,
      'first_air_date.gte': toDate(yearAgo(today)),
      'first_air_date.lte': toDate(today),
    }),
    themeCandidates({ base: filter, limited }).then((candidates) =>
      rankThemes(candidates, (theme) => count(allOf(filter, theme))),
    ),
  ]);

  // Equal decades: the earlier one
  const [peak] = decades.sort((a, b) => b.count - a.count || a.id - b.id);
  const chips = subGenres.sort(byCountThenId).slice(0, MAX_CHIPS);

  return {
    alsoWith: alsoWith.slice(0, 3),
    byKind: chips.filter((chip) => chip.count >= MIN_SHOWS).slice(0, 4),
    count: total,
    newLastYear,
    // A capped count is a floor: which decade peaks, and by how much, is
    // unknown ("20,000+ started in the 2020s" beside "20,000+ shows")
    peakDecade:
      peak && peak.count > 0 && !isCappedCount(peak.count)
        ? { count: peak.count, slug: peak.slug }
        : null,
    slug,
    subGenres: chips,
    type: 'genre',
  };
};
