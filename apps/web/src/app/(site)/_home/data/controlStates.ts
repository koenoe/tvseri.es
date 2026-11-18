import 'server-only';

import { cache } from 'react';

import { isUnavailable } from '@/lib/cache/unavailable';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import { loadSeriesStates } from '@/lib/marking/server/seriesStates';

import { getPickPool, getPremieres, getSpotlight } from './home';

/** Ids of a cached section, none when it is unavailable */
const idsOf = (
  items:
    | ReadonlyArray<Readonly<{ id: number }>>
    | Readonly<{ unavailable: true }>,
) => (isUnavailable(items) ? [] : items.map((item) => item.id));

/**
 * Home's one read of the viewer's states, for every series with a marking
 * control on the page: the spotlight's slides, the Premieres tickets and
 * the Pick deck's pool, which a viewer is dealt from (Versus and Connected
 * by only show series in none of the viewer's lists; Binge asks for
 * nothing). Each section starts it and hands
 * the promise to its controls; `cache` makes it one read per request. The
 * sections' lists are the cached ones the page draws.
 */
export const getHomeControlStates = cache(
  async (day: string): ControlStatesRead => {
    const [spotlight, premieres, deck] = await Promise.all([
      getSpotlight(),
      getPremieres(day),
      getPickPool(day),
    ]);
    const premiereIds = isUnavailable(premieres)
      ? []
      : premieres.map((premiere) => premiere.series.id);
    return loadSeriesStates([
      ...idsOf(spotlight),
      ...premiereIds,
      ...idsOf(deck),
    ]);
  },
);
