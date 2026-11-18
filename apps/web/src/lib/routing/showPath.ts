/**
 * The show page's URL: `/{id}/{slug}`, or `/{id}` when there is no slug
 * (the `[id]/[[...slug]]` route takes both).
 */
export default function showPath(
  id: number | string,
  slug?: string | null,
): string {
  return slug ? `/${id}/${slug}` : `/${id}`;
}
