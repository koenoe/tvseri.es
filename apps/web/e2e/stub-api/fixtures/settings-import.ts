import { randomUUID } from 'node:crypto';

import {
  type ImportBatch,
  type LastImport,
  MIN_WATCHED_AT,
} from '@tvseri.es/schemas';

import type { StubRequest, StubResponse, StubRoute } from '../types.ts';
import {
  isSettingsViewer,
  requireSettingsViewer,
  type SettingsViewer,
} from './settings/http.ts';
import {
  searchCatalogue,
  specById,
  toSeason,
  toSeries,
} from './settings-import/catalog.ts';
import { fail, isRecord, ok } from './show/http.ts';

/**
 * The importer's slice of the stub: the catalogue behind the title search
 * (`settings-import/catalog.ts`) and the API's import routes on the settings
 * store's `lastImport`. Marks written by an import are kept per
 * viewer (`importMarks`: episode key -> import id), so a second import skips
 * what the first wrote, and Undo takes only an import's own marks away.
 */

const DAY = 86_400_000;
/** How long the stub's Undo takes ("within a minute or so" in the API) */
const UNDO_MS = 1_500;

/** Watched before any import: "already watched" rows are skipped. */
const PRE_WATCHED = new Set(['910006-S07E01']);

const keyOf = (item: ImportBatch[number]) =>
  `${item.tvSeries.id}-S${String(item.episode.seasonNumber).padStart(2, '0')}E${String(item.episode.episodeNumber).padStart(2, '0')}`;

const codeOf = (key: string) => key.slice(key.indexOf('-') + 1);

const me =
  (handle: (request: StubRequest, viewer: SettingsViewer) => StubResponse) =>
  (request: StubRequest): StubResponse => {
    const viewer = requireSettingsViewer(request.headers);
    return isSettingsViewer(viewer) ? handle(request, viewer) : viewer;
  };

/** The API's `ImportBatchSchema`, as far as the stub needs it. */
const readBatch = (body: unknown): ImportBatch | null => {
  if (!Array.isArray(body) || body.length < 1 || body.length > 100) {
    return null;
  }
  const now = Date.now();
  for (const item of body) {
    if (
      !isRecord(item) ||
      !isRecord(item.episode) ||
      !isRecord(item.tvSeries) ||
      typeof item.tvSeries.id !== 'number' ||
      typeof item.episode.seasonNumber !== 'number' ||
      typeof item.episode.episodeNumber !== 'number' ||
      typeof item.watchedAt !== 'number' ||
      !Number.isInteger(item.watchedAt) ||
      item.watchedAt < MIN_WATCHED_AT ||
      item.watchedAt > now + DAY ||
      'userId' in item
    ) {
      return null;
    }
  }
  return body as ImportBatch;
};

/** The user's last import when it is `importId` and Undo has not begun. */
const openImport = (
  { state }: SettingsViewer,
  importId: string | undefined,
): LastImport | null => {
  const last = state.lastImport;
  return last &&
    last.importId === importId &&
    !last.undoRequestedAt &&
    !last.undoneAt
    ? last
    : null;
};

const marksOf = (viewer: SettingsViewer): Map<string, string> => {
  viewer.state.importMarks ??= new Map();
  return viewer.state.importMarks;
};

/** New marks of a batch (not watched before, once each). */
const newKeys = (viewer: SettingsViewer, batch: ImportBatch): string[] => {
  const marks = marksOf(viewer);
  return [
    ...new Set(
      batch
        .map(keyOf)
        .filter((key) => !marks.has(key) && !PRE_WATCHED.has(key)),
    ),
  ];
};

export const routes: readonly StubRoute[] = [
  {
    handle: ({ query }) => {
      const q = (query.get('q') ?? '').trim();
      return q ? ok(searchCatalogue(q)) : fail(400, 'Invalid query');
    },
    path: '/search/series',
  },
  {
    handle: (request) => {
      const spec = specById(Number(request.params.id));
      // Ids that are not the importer's pass on to the other fixtures
      return spec ? ok(toSeries(spec)) : undefined;
    },
    path: '/series/:id',
  },
  {
    handle: (request) => {
      const spec = specById(Number(request.params.id));
      if (!spec) {
        return undefined;
      }
      const season = toSeason(spec, Number(request.params.season));
      return season ? ok(season) : fail(404, 'Not found');
    },
    path: '/series/:id/season/:season',
  },
  {
    handle: me((_request, viewer) => {
      const lastImport = {
        createdAt: Date.now(),
        importId: randomUUID(),
        written: 0,
      };
      viewer.state.lastImport = lastImport;
      return ok(lastImport, 201);
    }),
    method: 'POST',
    path: '/me/imports',
  },
  {
    handle: me(({ body }, viewer) => {
      const batch = readBatch(body);
      if (!batch) {
        return fail(400, 'Invalid batch');
      }
      const keys = newKeys(viewer, batch);
      const fresh = new Set(keys);
      const skipped = new Set(
        batch.map(keyOf).filter((key) => !fresh.has(key)),
      );
      return ok({
        alreadyWatched: [...skipped].map((key) => ({
          code: codeOf(key),
          seriesId: Number(key.slice(0, key.indexOf('-'))),
        })),
        skipped: skipped.size,
        written: keys.length,
      });
    }),
    method: 'POST',
    path: '/me/imports/check',
  },
  {
    handle: me(({ body, params }, viewer) => {
      const batch = readBatch(body);
      if (!batch) {
        return fail(400, 'Invalid batch');
      }
      const lastImport = openImport(viewer, params.importId);
      if (!lastImport) {
        return fail(409, 'ImportNotOpen');
      }
      const keys = newKeys(viewer, batch);
      const marks = marksOf(viewer);
      for (const key of keys) {
        marks.set(key, lastImport.importId);
      }
      viewer.state.lastImport = {
        ...lastImport,
        skipped:
          (lastImport.skipped ?? 0) +
          (new Set(batch.map(keyOf)).size - keys.length),
        written: lastImport.written + keys.length,
      };
      viewer.state.counts.episodes += keys.length;
      return ok(
        {
          skipped: new Set(batch.map(keyOf)).size - keys.length,
          written: keys.length,
        },
        201,
      );
    }),
    method: 'POST',
    path: '/me/imports/:importId/batch',
  },
  {
    handle: me(({ params }, viewer) => {
      const lastImport = openImport(viewer, params.importId);
      if (!lastImport) {
        return fail(409, 'ImportNotOpen');
      }
      const requested = { ...lastImport, undoRequestedAt: Date.now() };
      viewer.state.lastImport = requested;
      const timer = setTimeout(() => {
        const marks = marksOf(viewer);
        let removed = 0;
        for (const [key, importId] of marks) {
          if (importId === requested.importId) {
            marks.delete(key);
            removed++;
          }
        }
        viewer.state.counts.episodes -= removed;
        if (viewer.state.lastImport?.importId === requested.importId) {
          viewer.state.lastImport = {
            ...viewer.state.lastImport,
            undoneAt: Date.now(),
          };
        }
      }, UNDO_MS);
      timer.unref();
      return ok({ status: 'queued' }, 202);
    }),
    method: 'DELETE',
    path: '/me/imports/:importId',
  },
];
