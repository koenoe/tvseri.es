import 'server-only';

import { getDiscoverLook } from '../../../_discover/data/leadColour';
import type { LandingLook } from '../../../_discover/landing/landingLook';
import { landscapeQuery } from './loaders';

/** The decade landing's ground: before a colour is known, or without one */
const DECADE_FALLBACK: LandingLook = { ground: '#141519' };

/** A decade landing's look, from its most-rated shows (the treemap's list) */
export const decadeLook = (slug: string): Promise<LandingLook> =>
  getDiscoverLook(landscapeQuery(slug), DECADE_FALLBACK);
