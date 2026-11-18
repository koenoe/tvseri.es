/**
 * Canonical URLs for the `[id]/[[...slug]]` pages (show, person): one URL
 * per entity, so a stale slug or a deep path 308s to it.
 */

import { TMDB_ID_PATTERN } from '@tvseri.es/constants';

const ID = new RegExp(`^0*(${TMDB_ID_PATTERN})$`);

/**
 * The canonical form of a numeric URL id (`'0123'` → `'123'`), or null when
 * it can't be a TMDB id (a 404): not all digits, zero, or more digits than
 * `MAX_TMDB_ID_DIGITS`.
 */
export function toCanonicalId(id: string): string | null {
  return ID.exec(id)?.[1] ?? null;
}

/**
 * Where a URL should 308 to: `toPath(id, slug)` when the URL's id has leading
 * zeros or its slug is missing, stale or deeper than one segment; null when
 * the URL is canonical.
 *
 * @example
 * canonicalPath(params, person, personPath)
 */
export function canonicalPath(
  params: Readonly<{ id: string; slug?: ReadonlyArray<string> }>,
  entity: Readonly<{ id: number; slug: string }>,
  toPath: (id: number | string, slug?: string | null) => string,
): string | null {
  const id = String(entity.id);
  const urlSlug = params.slug ?? [];
  const isCanonical =
    params.id === id &&
    (entity.slug
      ? urlSlug.length === 1 && urlSlug[0] === entity.slug
      : urlSlug.length === 0);
  return isCanonical ? null : toPath(id, entity.slug);
}
