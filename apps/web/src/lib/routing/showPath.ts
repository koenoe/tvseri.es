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

const SHOW_HREF = /^\/(\d+)(?:[/?#]|$)/;

/**
 * The show a link opens (`/{id}/…`, with or without a query), or null for
 * any other page: every numeric first segment is a show (`reservedSegments`).
 */
export function showIdOf(href: string): number | null {
  const id = SHOW_HREF.exec(href)?.[1];
  return id === undefined ? null : Number(id);
}
