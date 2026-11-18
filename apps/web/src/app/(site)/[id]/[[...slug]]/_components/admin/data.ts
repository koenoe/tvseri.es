import type { SeriesImages } from '@tvseri.es/schemas';

import { fetchJson } from '@/lib/series/useCachedJson';

import { adminStore, rememberColours, setImagesLoad } from './adminStore';
import { availability, type Served } from './picker';

/**
 * Loading the picker's data on the client (admins only, from
 * `/api/admin/series/:id/*`): the image choices once per show, and the page
 * colour of a backdrop on demand, a few neighbours at a time. Both are
 * deduplicated while in flight.
 */

export type ServedSeries = Served &
  Readonly<{ backdropColor: string; id: number }>;

const imagesUrl = (seriesId: number) => `/api/admin/series/${seriesId}/images`;

const coloursUrl = (seriesId: number, paths: ReadonlyArray<string>) =>
  `/api/admin/series/${seriesId}/backdrop-colours?${new URLSearchParams(
    paths.map((path) => ['path', path]),
  )}`;

const imagesInFlight = new Map<number, Promise<void>>();
const coloursInFlight = new Set<string>();

/** Seeds the colours the page already knows: what it serves, the saved pick. */
function seedColours(images: SeriesImages, served: ServedSeries) {
  const known: Record<string, string> = {};
  const servedPath = images.preferred
    ? images.preferred.backdropImagePath
    : (images.automatic.backdropPath ?? served.backdropPath);
  if (servedPath) {
    known[servedPath] = served.backdropColor;
  }
  if (images.preferred) {
    known[images.preferred.backdropImagePath] = images.preferred.backdropColor;
  }
  rememberColours(known);
}

export function setImages(images: SeriesImages, served: ServedSeries): void {
  setImagesLoad(served.id, {
    availability: availability(images, served),
    images,
    status: 'ready',
  });
}

/** Loads the show's choices unless they are loaded or loading. */
export function ensureImages(
  served: ServedSeries,
  { retry = false }: Readonly<{ retry?: boolean }> = {},
): Promise<void> {
  const current = adminStore.getState().images[served.id];
  if (current?.status === 'ready' || (current?.status === 'error' && !retry)) {
    return Promise.resolve();
  }
  const running = imagesInFlight.get(served.id);
  if (running) {
    return running;
  }
  setImagesLoad(served.id, { status: 'loading' });
  const request = fetchJson<SeriesImages>(imagesUrl(served.id))
    .then((images) => {
      seedColours(images, served);
      setImages(images, served);
    })
    .catch(() => setImagesLoad(served.id, { status: 'error' }))
    .finally(() => imagesInFlight.delete(served.id));
  imagesInFlight.set(served.id, request);
  return request;
}

export const colourOf = (path: string | null): string | undefined =>
  path ? adminStore.getState().colours[path] : undefined;

/**
 * Asks for the page colours of `paths` that aren't known or on their way
 * (the picked backdrop first, then its neighbours). Resolves when they're in.
 */
export async function fetchColours(
  seriesId: number,
  paths: ReadonlyArray<string>,
): Promise<void> {
  const known = adminStore.getState().colours;
  const missing = paths
    .filter((path) => !known[path] && !coloursInFlight.has(path))
    .slice(0, 8);
  if (missing.length === 0) {
    return;
  }
  for (const path of missing) {
    coloursInFlight.add(path);
  }
  try {
    rememberColours(
      await fetchJson<Readonly<Record<string, string>>>(
        coloursUrl(seriesId, missing),
      ),
    );
  } catch {
    // The swatch keeps the last colour; the next pick asks again.
  } finally {
    for (const path of missing) {
      coloursInFlight.delete(path);
    }
  }
}

/** Resolves with the colour once known (another request may be fetching it). */
export function waitForColour(
  seriesId: number,
  path: string,
  neighbours: ReadonlyArray<string>,
): Promise<string | undefined> {
  const known = colourOf(path);
  if (known) {
    return Promise.resolve(known);
  }
  return new Promise((resolve) => {
    const unsubscribe = adminStore.subscribe((state) => {
      const colour = state.colours[path];
      if (colour) {
        unsubscribe();
        resolve(colour);
      }
    });
    fetchColours(seriesId, [path, ...neighbours]).then(() => {
      if (!coloursInFlight.has(path)) {
        unsubscribe();
        resolve(colourOf(path));
      }
    });
  });
}
