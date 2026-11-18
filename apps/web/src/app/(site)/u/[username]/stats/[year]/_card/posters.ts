/**
 * The wall's posters. The API sends posters at TMDB's
 * `w300_and_h450_bestv2` (see `lib/tmdbImageLoader.ts`); the card swaps the
 * size segment for the smallest standard size that covers the poster:
 * `w185` for the small ones (104px), `w342` for the rest (the story's #1 is
 * 331px). Other URLs (the stub's local images) are used as given.
 */

import { isLocalHttp } from '@tvseri.es/constants';

const TMDB_POSTER =
  /^(https:\/\/image\.tmdb\.org\/t\/p\/)w300_and_h450_bestv2(\/.+)$/;

export function posterSource(url: string, width: number): string {
  const match = TMDB_POSTER.exec(url);
  if (!match) {
    return url;
  }
  return `${match[1]}${width <= 185 ? 'w185' : 'w342'}${match[2]}`;
}

/**
 * Where the card may fetch a poster from: TMDB's image host over https, or
 * a local stub over http (e2e and local runs). Never anything else the API
 * might send, and never a redirect away from these (`redirect: 'error'`).
 */
export function isPosterHost(url: string): boolean {
  if (!URL.canParse(url)) {
    return false;
  }
  const parsed = new URL(url);
  if (parsed.protocol === 'https:') {
    return parsed.hostname === 'image.tmdb.org' && parsed.port === '';
  }
  return isLocalHttp(parsed);
}

/** A w342 poster is ~30 KB: anything past this isn't a poster */
export const MAX_POSTER_BYTES = 2 * 1024 * 1024;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

/** The body, or null as soon as it passes `MAX_POSTER_BYTES` */
async function readCapped(response: Response): Promise<Buffer | null> {
  if (Number(response.headers.get('content-length')) > MAX_POSTER_BYTES) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body?.getReader();
  if (!reader) {
    return null;
  }
  const chunks: Array<Uint8Array> = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return Buffer.concat(chunks);
    }
    total += value.byteLength;
    if (total > MAX_POSTER_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

/**
 * The poster as a data URL (satori draws a buffer without fetching again),
 * or null when it can't be had: the card then draws the title tile.
 */
export async function loadPoster(
  url: string | null,
  width: number,
): Promise<string | null> {
  if (!url) {
    return null;
  }
  const source = posterSource(url, width);
  if (!isPosterHost(source)) {
    return null;
  }
  try {
    const response = await fetch(source, {
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    const type = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (!response.ok || !IMAGE_TYPES.has(type)) {
      await response.body?.cancel();
      return null;
    }
    const bytes = await readCapped(response);
    return bytes ? `data:${type};base64,${bytes.toString('base64')}` : null;
  } catch {
    return null;
  }
}

/**
 * Whether a poster that should be on the card is missing (its fetch failed
 * or was refused): the card is then degraded and cached only briefly. A
 * show without a poster is drawn as its title tile on purpose.
 */
export const missesPoster = (
  sources: ReadonlyArray<string | null>,
  posters: ReadonlyArray<string | null>,
): boolean =>
  sources.some((source, index) => source !== null && posters[index] === null);
