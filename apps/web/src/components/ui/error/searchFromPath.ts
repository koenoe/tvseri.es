import { MAX_QUERY_LENGTH } from '@/lib/search/searchKey';

/**
 * Paths that never name a show or a person: a profile and its tabs
 * (`/u/name/stats/2025`), settings, route handlers, the style guide.
 */
const NOT_A_TITLE = new Set(['api', 'dev', 'settings', 'u']);

/**
 * The 404's search prefill: the last segment of the path that has letters,
 * as words (/shows/breaking-bad → “breaking bad”). Empty when the
 * path has no words, or is a profile or settings URL (searching “stats” or a
 * username finds nothing).
 */
export function searchFromPath(pathname: string): string {
  // A segment that doesn't decode is no words ('/%E0%A4%A'): left out
  const segments = pathname.split('/').map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return '';
    }
  });
  if (NOT_A_TITLE.has(segments[1]?.toLowerCase() ?? '')) {
    return '';
  }
  const words = segments.filter((segment) => /\p{L}/u.test(segment));
  return (words.at(-1) ?? '')
    .replace(/[-_+.\s]+/g, ' ')
    .slice(0, MAX_QUERY_LENGTH)
    .trim();
}
