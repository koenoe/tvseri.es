/**
 * The show page's query suffix for its canonical redirect. The id and slug
 * rules are shared: `toCanonicalId` / `canonicalPath` in `@/lib/routing/canonical`.
 */

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

/**
 * The request's query as a `?…` suffix ('' when empty), so the redirect
 * keeps `?season=2&episode=6` and a bare `?history`.
 */
export function toQuerySuffix(searchParams: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        query.append(key, item);
      }
    }
  }
  const search = query.toString().replace(/=(&|$)/g, '$1');
  return search ? `?${search}` : '';
}
