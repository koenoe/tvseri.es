import { REDUCED_MOTION } from './breakpoints';
import { matchesNow } from './useMediaQuery';

/** For a scroll a script starts: smooth, unless the reader asked for reduced motion */
export default function scrollBehavior(): ScrollBehavior {
  return matchesNow(REDUCED_MOTION) ? 'instant' : 'smooth';
}
