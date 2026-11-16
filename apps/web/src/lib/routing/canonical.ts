/**
 * Canonical URLs for the `[id]/[[...slug]]` pages (show, person): one URL
 * per entity, so a stale slug or a deep path 308s to it.
 */

/**
 * The canonical form of a numeric URL id (`'0123'` → `'123'`), or null when
 * it isn't a safe positive integer id (a 404).
 */
export function toCanonicalId(id: string): string | null {
  if (!/^\d{1,16}$/.test(id)) {
    return null;
  }
  const value = Number(id);
  return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
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
