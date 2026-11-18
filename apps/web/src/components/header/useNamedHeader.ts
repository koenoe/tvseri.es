import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { useHeaderStore } from './HeaderStoreProvider';
import { usePageNameStore } from './pageNameStore';

/**
 * The page name the phone header shows in place of the logo: set while the
 * page's title is scrolled away, on a phone only. Null everywhere else, and
 * while the menu is open (the bar shows the logo over the glass).
 * The selectors answer for the phone only, so off the phone a title
 * scrolling away or the menu opening re-renders nothing.
 */
export default function useNamedHeader(): string | null {
  const isPhone = useMediaQuery(PHONE);
  const name = usePageNameStore((state) =>
    isPhone && state.titleAway ? state.name : null,
  );
  const menuOpen = useHeaderStore((state) => isPhone && state.menuOpen);
  return menuOpen ? null : name;
}
