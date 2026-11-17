import type { DecadeLandingFacts } from '@tvseri.es/schemas';

import type { StubRoute } from '../types';
import { CATALOGUE } from './discover/catalogue';

/**
 * The decade landing: its facts. The treemap and Missed by most
 * read `/discover` over the catalogue (`discover-catalogue.ts`); the card's
 * network and seasons come from `/series/summaries` (`discover-api.ts`).
 * The 2010s have a realistic 41,800 shows.
 */
const KNOWN_COUNTS: Readonly<Record<string, number>> = { '2010s': 41_800 };

const DECADE = /^(\d{3})0s$/;

export const routes: ReadonlyArray<StubRoute> = [
  {
    handle: ({ params }) => {
      if (params.type !== 'decade') {
        return undefined;
      }
      const slug = params.slug ?? '';
      const match = DECADE.exec(slug);
      if (!match) {
        return { body: { message: 'Not Found' }, status: 404 };
      }
      const from = Number(slug.slice(0, 4));
      const body: DecadeLandingFacts = {
        count:
          KNOWN_COUNTS[slug] ??
          CATALOGUE.filter((show) => show.year >= from && show.year <= from + 9)
            .length,
        slug,
        type: 'decade',
      };
      return { body };
    },
    path: '/discover/landing/:type/:slug/facts',
  },
];
