import { landingFilter, NETWORKS } from '@tvseri.es/constants';
import type { CountryLandingFacts } from '@tvseri.es/schemas';

import type { StubRoute } from '../types';
import { SHOWS } from './discover/shows';

/**
 * The country landing: `GET /discover/landing/country/:code/facts`.
 * The three states keep fixed numbers (7,240, 4,860 and 1,120 shows)
 * and broadcasters (Denmark has fewer than 3, so its `madeFor` is empty);
 * every other country is counted from the stub catalogue.
 */

const made = (slug: string, count: number) => {
  const network = NETWORKS.find((item) => item.slug === slug);
  if (!network) {
    throw new Error(`no landing network "${slug}"`);
  }
  return { count, id: network.id, name: network.name, slug };
};

const SAMPLE_FACTS: Readonly<Record<string, CountryLandingFacts>> = {
  dk: { count: 1120, madeFor: [], slug: 'dk', type: 'country' },
  gb: {
    count: 7240,
    madeFor: [
      made('bbc-one', 2950),
      made('itv1', 1980),
      made('channel-4', 1210),
    ],
    slug: 'gb',
    type: 'country',
  },
  kr: {
    count: 4860,
    madeFor: [made('tvn', 610), made('jtbc', 420), made('netflix', 260)],
    slug: 'kr',
    type: 'country',
  },
};

export const routes: ReadonlyArray<StubRoute> = [
  {
    handle: ({ params }) => {
      if (params.type !== 'country') {
        return undefined;
      }
      const slug = (params.slug ?? '').toLowerCase();
      if (!landingFilter('country', slug)) {
        return { body: { message: 'Not Found' }, status: 404 };
      }
      const body: CountryLandingFacts = SAMPLE_FACTS[slug] ?? {
        count: SHOWS.filter(
          (entry) => entry.show.country === slug.toUpperCase(),
        ).length,
        madeFor: [],
        slug,
        type: 'country',
      };
      return { body };
    },
    path: '/discover/landing/:type/:slug/facts',
  },
];
