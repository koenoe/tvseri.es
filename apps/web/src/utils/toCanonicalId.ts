import isNumericId from './isNumericId';

/**
 * The canonical form of a numeric URL id (`'0123'` → `'123'`), or null when
 * it isn't a safe integer id at all. Pages redirect when the URL id differs
 * from this, so leading zeros never become their own cache/ISR entries.
 */
export default function toCanonicalId(id: string): string | null {
  if (!isNumericId(id)) {
    return null;
  }

  const value = Number(id);

  return Number.isSafeInteger(value) ? String(value) : null;
}
