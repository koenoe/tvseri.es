import 'server-only';

import { getDiscoverLook } from '../../../_discover/data/leadColour';
import type { LandingLook } from '../../../_discover/landing/landingLook';
import { languageQuery } from './loaders';

/** The language landing's ground: before a colour is known, or without one */
const LANGUAGE_FALLBACK: LandingLook = { ground: '#17151a' };

/** A language landing's look, from its most-rated shows (Start here's list) */
export const languageLook = (code: string): Promise<LandingLook> =>
  getDiscoverLook(languageQuery(code), LANGUAGE_FALLBACK);
