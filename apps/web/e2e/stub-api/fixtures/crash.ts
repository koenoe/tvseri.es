/**
 * A show whose read answers 200 with a body the page can't render (lists
 * that aren't lists), so the page throws a plain error and the root error
 * boundary draws its 500 (`footer.spec.ts`: no site footer under it).
 * Used by that spec only.
 */
import type { StubRoute } from '../types.ts';
import { findShow, SHOW_IDS, toSeries } from './show/catalog.ts';
import { ok } from './show/http.ts';

const CRASH_ID = 900093;

const bear = findShow(SHOW_IDS.bear);

export const routes: readonly StubRoute[] = [
  {
    handle: ({ params }) =>
      params.id === String(CRASH_ID) && bear
        ? ok({
            ...toSeries(
              { ...bear, id: CRASH_ID, slug: 'crash', title: 'Crash' },
              { includeImages: false, preferred: undefined },
            ),
            genres: 'broken',
            seasons: 'broken',
          })
        : undefined,
    path: '/series/:id',
  },
];
