import type { Metadata } from 'next';

/**
 * Every landing's metadata for a slug without a landing. The static 404
 * rewrites (`lib/routing/landingNotFound.ts`) answer nearly all of them; only
 * another case of a known slug (`/genre/Crime`, `/country/GB`) still reaches
 * a page, which then calls `notFound()`.
 */
export const NOT_FOUND_METADATA: Metadata = { title: 'Page not found' };
