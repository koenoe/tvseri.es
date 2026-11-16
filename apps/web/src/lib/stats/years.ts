/**
 * Which years have a Stats page: 2000 (imports can backdate watches) to next
 * year (time zones ahead of the server's). Shared by the page's year rule and
 * the static 404 rewrite for other years (`lib/routing/profileNotFound`).
 */
export const FIRST_STATS_YEAR = 2000;

/**
 * Next year in UTC. Read at module scope (Cache Components rejects reading
 * the clock in a prerender), so it is fixed per server process, and per
 * build for the rewrite.
 */
export const nextUtcYear = (now: Date = new Date()): number =>
  now.getUTCFullYear() + 1;
