import 'server-only';

import { isUnavailable } from '@/lib/cache/unavailable';
import { loadSeriesOrNull } from '@/lib/series/loaders';

import {
  type LandingLook,
  landingLook,
  pickLeadColour,
} from '../landing/landingLook';
import { getDiscoverShows } from './discover';

/**
 * A landing's lead show's colour (`GET /series/:id`'s `backdropColor`: the
 * admin's pick or the backdrop's dominant colour), for `landingLook`. The
 * show page's cached read (`loadSeries`), so a landing whose Start here tile
 * already read its show asks nothing more. Null when the show has none or
 * the API can't answer (that read is cached briefly, so the page regenerates
 * with the colour once it can).
 */
async function getLeadColour(id: number): Promise<string | null> {
  return (await loadSeriesOrNull(id))?.backdropColor ?? null;
}

/** Candidates a landing's colour is picked from, lead first (`pickLeadColour`) */
const CANDIDATES = 6;

/**
 * The colour for a landing's look from its candidate shows, lead first:
 * the first with a hue (`pickLeadColour`), each read cached per show.
 */
export async function getLandingColour(
  ids: ReadonlyArray<number>,
): Promise<string | null> {
  const colours = await Promise.all(
    [...new Set(ids)].slice(0, CANDIDATES).map(getLeadColour),
  );
  return pickLeadColour(colours);
}

/**
 * The look of a landing led by a discover list (a language's or a decade's
 * most-rated, the same cached list its page draws): from its shows' colour
 * (`getLandingColour`), else `fallback`. No cache scope of its own: its reads
 * are cached, so the prerendered page has its colour in the shell.
 */
export async function getDiscoverLook(
  query: string,
  fallback: LandingLook,
): Promise<LandingLook> {
  const shows = await getDiscoverShows(query);
  const colour = isUnavailable(shows)
    ? null
    : await getLandingColour(shows.items.map((show) => show.id));
  return landingLook(colour, fallback);
}
