import 'server-only';

import { isUnavailable } from '@/lib/cache/unavailable';

import { getDiscoverShows } from '../../_discover/data/discover';
import { getLandingColour } from '../../_discover/data/leadColour';
import {
  type LandingLook,
  landingLook,
} from '../../_discover/landing/landingLook';
import { getThemeSpotlight, themeBestQuery } from './rows';

/** The theme landings' default ground (no glow: the Start here tile carries the colour) */
const THEME_FALLBACK: LandingLook = { ground: '#151c1f' };

/**
 * A theme landing's ground: its Start here show's colour, adjusted by
 * `landingLook`. Only a theme without a Start here show takes the colour
 * from its best (the same cached reads). No cache scope of its own (see
 * `genreLook`).
 */
export async function themeLook(slug: string): Promise<LandingLook> {
  const [spotlight, best] = await Promise.all([
    getThemeSpotlight(slug),
    getDiscoverShows(themeBestQuery(slug)),
  ]);
  if (spotlight && !isUnavailable(spotlight)) {
    const colour = await getLandingColour([spotlight.show.id]);
    return landingLook(colour, THEME_FALLBACK);
  }
  const ids = isUnavailable(best) ? [] : best.items.map((show) => show.id);
  const colour = await getLandingColour(ids);
  return landingLook(colour, THEME_FALLBACK);
}
