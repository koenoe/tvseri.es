import type { ListItem } from '@tvseri.es/schemas';

import type { StubRoute } from '../types.ts';
import { img, imgPath } from './show/catalog.ts';
import { fail, isResponse, ok, requireViewer } from './show/http.ts';
import { VIEWERS } from './show/store.ts';

/**
 * The importer UI's slice of the stub: the viewer's finished and in-progress
 * lists, which the drop zone's poster wall reads (only the user's own
 * shows). `alex` and `rae` have
 * twelve; `nina` (brand new) and `sam` have none, so their wall
 * stays neutral.
 */

const WALL = [
  ['Dark', 'ds_dark_p.jpg'],
  ['Black Mirror', 'st_p_blackmirror.jpg'],
  ['Peaky Blinders', 'ds_peaky_p.jpg'],
  ['TYSON', 'set_p_tyson.jpg'],
  ['Baby Reindeer', 'ds_babyreindeer_p.jpg'],
  ['Adolescence', 'st_p_adolescence.jpg'],
  ['Eric', 'ds_eric_p.jpg'],
  ['Taken: Natalee Holloway', 'set_p_taken.jpg'],
  ['Black Rabbit', 'ds_blackrabbit_p.jpg'],
  ['Dept. Q', 'st_p_deptq.jpg'],
  ['Cyberpunk: Edgerunners', 'ds_edgerunners_p.jpg'],
  ['Top Boy', 'set_p_topboy2019.jpg'],
] as const;

const item = (
  [title, file]: (typeof WALL)[number],
  index: number,
): ListItem => ({
  createdAt: Date.UTC(2026, 10, 1) - index * 86_400_000,
  id: 980_001 + index,
  posterImage: img(file),
  posterPath: imgPath(file),
  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  status: 'Ended',
  title,
});

const HAS_WALL = new Set<string>([VIEWERS.alex.id, VIEWERS.rae.id]);

export const routes: ReadonlyArray<StubRoute> = [
  {
    handle: ({ headers, params, query }) => {
      const owner = (params.id ?? '').toUpperCase();
      // Only the settings viewers' walls; other streams' users pass on
      if (!Object.values(VIEWERS).some((viewer) => viewer.id === owner)) {
        return undefined;
      }
      const viewer = requireViewer(headers);
      if (isResponse(viewer)) {
        return viewer;
      }
      const list = (params.list ?? '').toLowerCase();
      if (
        !['watched', 'in_progress', 'watchlist', 'favorites'].includes(list)
      ) {
        return fail(400, 'Invalid list');
      }
      const limit = Number(query.get('limit') ?? 20);
      const items =
        list === 'watched' && HAS_WALL.has(owner) ? WALL.map(item) : [];
      return ok({ items: items.slice(0, limit), nextCursor: null });
    },
    path: '/user/:id/list/:list',
  },
];
