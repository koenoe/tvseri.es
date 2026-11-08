/**
 * Where a `/{segment}/{id}/{slug}` page should 308 to: its canonical path when
 * the URL id isn't canonical (leading zeros, see toCanonicalId) or the slug is
 * stale, null when the URL already is canonical. Metadata returns nothing
 * for a non-null path, as the page redirects.
 */
export default function canonicalPath({
  id,
  params,
  segment,
  slug,
}: Readonly<{
  /** The canonical id (toCanonicalId) */
  id: string;
  params: Readonly<{ id: string; slug?: ReadonlyArray<string> }>;
  segment: 'person' | 'track' | 'tv';
  /** The entity's current slug */
  slug?: string;
}>): string | null {
  if (id === params.id && (!slug || slug === params.slug?.join(''))) {
    return null;
  }

  return slug ? `/${segment}/${id}/${slug}` : `/${segment}/${id}`;
}
