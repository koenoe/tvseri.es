import { type LandingFilter, NETWORKS } from '@tvseri.es/constants';
import type { CountryLandingFacts } from '@tvseri.es/schemas';

import { byCountThenId, type Counter, MAX_CHIPS, MIN_SHOWS } from './shared';

/** The switch shows when at least this many networks qualify */
const MIN_NETWORKS = 3;

/**
 * "Made for": which of the landing networks (see `NETWORKS`) most shows of the
 * country went to. A network qualifies with 12+ of the country's shows.
 */
export const countryFacts = async ({
  count,
  filter,
  slug,
}: Readonly<{
  count: Counter;
  filter: LandingFilter;
  slug: string;
}>): Promise<CountryLandingFacts> => {
  const total = await count(filter);

  if (total < MIN_SHOWS) {
    return { count: total, madeFor: [], slug, type: 'country' };
  }

  const counted = await Promise.all(
    NETWORKS.map(async ({ id, name, slug: networkSlug }) => ({
      count: await count({ ...filter, with_networks: String(id) }),
      id,
      name,
      slug: networkSlug,
    })),
  );
  const qualified = counted
    .filter((network) => network.count >= MIN_SHOWS)
    .sort(byCountThenId)
    .slice(0, MAX_CHIPS);

  return {
    count: total,
    madeFor: qualified.length >= MIN_NETWORKS ? qualified : [],
    slug,
    type: 'country',
  };
};
