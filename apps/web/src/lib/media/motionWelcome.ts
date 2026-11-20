import { REDUCED_MOTION } from './breakpoints';
import { matchesNow } from './useMediaQuery';

/**
 * Motion beyond the essentials is welcome now: the viewer hasn't asked for
 * less, and the device isn't a slow one (`data-flat-glass`, set before the
 * first paint). For a view transition, read it before naming anything: no
 * name, nothing captured. Browser only.
 */
export const motionWelcome = (): boolean =>
  !matchesNow(REDUCED_MOTION) &&
  !document.documentElement.hasAttribute('data-flat-glass');
