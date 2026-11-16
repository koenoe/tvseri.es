/**
 * The person page's URL: `/person/{id}/{slug}`, or `/person/{id}` when there
 * is no slug (the `person/[id]/[[...slug]]` route takes both).
 */
export default function personPath(
  id: number | string,
  slug?: string | null,
): string {
  return slug ? `/person/${id}/${slug}` : `/person/${id}`;
}
