import type { LanguageLandingFacts, RomanizedTitles } from '@tvseri.es/schemas';

import type { StubRoute } from '../types';
import { CATALOGUE } from './discover/catalogue';
import { byId } from './discover/shows';

/**
 * The language landing: its facts and the romanised titles of
 * the script switch (the catalogue's `romaji`; null when the title is Latin
 * already or none is known, as the API answers). DSLLanguage prints 16,900
 * shows for Japanese.
 */
const BOARD_COUNTS: Readonly<Record<string, number>> = { ja: 16_900 };

export const routes: ReadonlyArray<StubRoute> = [
  {
    handle: ({ params }) => {
      if (params.type !== 'language') {
        return undefined;
      }
      const slug = params.slug ?? '';
      const count =
        BOARD_COUNTS[slug] ??
        CATALOGUE.filter((show) => show.language === slug).length;
      if (count === 0) {
        return { body: { message: 'Not Found' }, status: 404 };
      }
      const body: LanguageLandingFacts = { count, slug, type: 'language' };
      return { body };
    },
    path: '/discover/landing/:type/:slug/facts',
  },
  {
    handle: ({ query }) => {
      const ids = (query.get('ids') ?? '').split(',').filter(Boolean);
      if (ids.length === 0 || ids.length > 50) {
        return { body: { message: 'Bad Request' }, status: 400 };
      }
      const body: RomanizedTitles = Object.fromEntries(
        ids.map((id) => [id, byId(Number(id))?.show.romaji ?? null]),
      );
      return { body };
    },
    path: '/series/romanized-titles',
  },
];
