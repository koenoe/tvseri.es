import { allOf, excluding, type LandingFilter } from '@tvseri.es/constants';
import type { ThemeLandingFacts } from '@tvseri.es/schemas';

import {
  type Counter,
  chipFilter,
  genreShares,
  type Limited,
  MAX_CHIPS,
  MIN_SHOWS,
  rankThemes,
  themeCandidates,
} from './shared';

export const themeFacts = async ({
  count,
  filter,
  limited,
  slug,
}: Readonly<{
  count: Counter;
  filter: LandingFilter;
  limited: Limited;
  slug: string;
}>): Promise<ThemeLandingFacts> => {
  const total = await count(filter);

  if (total === 0) {
    return {
      count: 0,
      nextDoor: [],
      oftenTaggedWith: [],
      slug,
      topGenres: [],
      type: 'theme',
    };
  }

  const [topGenres, tagged] = await Promise.all([
    genreShares({ count, filter, total }),
    themeCandidates({ base: filter, exceptSlug: slug, limited }).then(
      (candidates) =>
        rankThemes(candidates, (theme) => count(allOf(filter, theme))),
    ),
  ]);

  const oftenTaggedWith = tagged.slice(0, MAX_CHIPS);
  // "Next door": that theme's shows that don't carry this one (the web's tabs use the same filter)
  const withoutSelf = await Promise.all(
    oftenTaggedWith.map(async (chip) => ({
      ...chip,
      count: await count(excluding(chipFilter(chip), filter)),
    })),
  );

  return {
    count: total,
    nextDoor: withoutSelf.filter((chip) => chip.count >= MIN_SHOWS).slice(0, 4),
    oftenTaggedWith,
    slug,
    topGenres: topGenres.slice(0, 2),
    type: 'theme',
  };
};
