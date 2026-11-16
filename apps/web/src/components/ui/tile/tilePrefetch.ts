export type TilePrefetch = 'intent' | 'viewport';

/**
 * When show and person tiles prefetch their page:
 *
 * - `viewport` (Next's default `<Link>`): as a tile scrolls into view. The
 *   page is there before the click, also on touch screens, which never
 *   hover. Each unseen page it prefetches is generated then (a function run,
 *   the page's API reads and an ISR write): cheap on Vercel Pro at this
 *   traffic.
 * - `intent`: only on hover, keyboard focus or the first touch. About half
 *   the functions and API reads on a page full of tiles, but a click
 *   without a hover waits for the page (measured 0.3–0.8 s locally).
 *
 * `viewport`: the UI must feel instant. Switch
 * here if the cost matters again (e.g. on Vercel Hobby, whose ISR-write
 * allowance this uses up first).
 */
export const TILE_PREFETCH: TilePrefetch = 'viewport';

/**
 * Links to a person page (cast, collaborators, credits, faces, the
 * Discover creator card): `intent`. A person page is the costliest to
 * generate (seven or more API reads, a career of up to 80 series) and an
 * episode's credits put dozens of names in view at once; hover and tap
 * are enough there.
 */
export const PERSON_PREFETCH: TilePrefetch = 'intent';
