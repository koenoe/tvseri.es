import type { TvSeries } from '@tvseri.es/schemas';

import { isUnavailable } from '@/lib/cache/unavailable';
import type { EntitySpec } from '@/lib/routing/entityRoute';
import showPath from '@/lib/routing/showPath';

import { loadShow } from './loaders';

/** How the show page and its metadata resolve the URL (`resolveEntityRoute`) */
export const SHOW_ROUTE: EntitySpec<TvSeries> = {
  entity: (series) => series,
  load: async (id) => {
    const show = await loadShow(id);
    if (isUnavailable(show)) {
      return show;
    }
    return show.status === 'ok' ? show.series : null;
  },
  toPath: showPath,
};
