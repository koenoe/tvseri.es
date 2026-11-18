import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { useHeaderStore } from './HeaderStoreProvider';
import type { HeaderMode } from './headerMode';
import useNamedHeader from './useNamedHeader';

/** What the header draws: its scroll mode, or the phone's menu or name bar */
export type HeaderLook = HeaderMode | 'menu' | 'named';

/**
 * The header's look (`data-header-mode`): the store's mode, unless a phone's
 * menu is open or a phone page's name bar shows.
 */
export default function useHeaderLook(): Readonly<{
  named: boolean;
  visual: HeaderLook;
}> {
  const isPhone = useMediaQuery(PHONE);
  const mode = useHeaderStore((state) => state.mode);
  const named = useNamedHeader() !== null;
  // While the phone menu is open the header is the transparent bar at the
  // top over its glass; opened from the pill, the pill settles into the bar
  // (the same 300ms morph) and comes back on close
  const phoneMenu = useHeaderStore((state) => isPhone && state.menuOpen);
  // Scrolled on a landing's phone page the header is the name bar, whichever
  // way the page scrolls (the pill and the hidden bar step aside)
  const visual = phoneMenu ? 'menu' : named ? 'named' : mode;
  return { named, visual };
}
