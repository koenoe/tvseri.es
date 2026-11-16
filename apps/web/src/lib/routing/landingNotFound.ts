import { LANDING_SLUGS, LANDING_TYPES } from '@tvseri.es/constants';

/** Escapes a slug for a path-to-regexp pattern (slugs are `[a-z0-9-]` today) */
const escapeSlug = (slug: string) =>
  slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * One `beforeFiles` rewrite per landing type: a slug without a landing
 * (`/genre/junk`, `/country/zz`, `/decade/2015s`) is served the static,
 * prerendered 404 without running a function or writing an ISR entry, the
 * same way as `NOT_FOUND_REWRITE`. The slug lists come from
 * `@tvseri.es/constants`, so a new landing needs no change here. The pages
 * keep their `notFound()` as the second guard.
 *
 * Next and Vercel match rewrites without case, so another case of a known
 * slug (`/country/GB`) passes and its page answers the 404.
 */
export const LANDING_NOT_FOUND_REWRITES = LANDING_TYPES.map((type) => ({
  destination: '/_not-found',
  source: `/${type}/:slug((?!(?:${LANDING_SLUGS[type].map(escapeSlug).join('|')})$)[^/]+)`,
}));
