import Menu from '@/components/menu/Menu';
import MotionProvider from '@/components/motion/MotionProvider';

import HeaderFrame from './HeaderFrame';
import HeaderLogo from './HeaderLogo';
import HeaderScrollTracker from './HeaderScrollTracker';
import { HeaderStoreProvider } from './HeaderStoreProvider';

/**
 * The site header: static bar, frosted pill on
 * scroll-up, hidden on scroll-down. No session read: the username comes from
 * a display cookie on the client, so the header is part of the static shell
 * and its HTML is the same signed in and out.
 */
export default function Header() {
  return (
    <HeaderStoreProvider>
      <HeaderScrollTracker />
      <HeaderFrame>
        {/* The menu, Sign in and search animate from the first frame, before
            HeaderFrame's MaxMotion has domMax. Built here, on the server, so
            a HeaderFrame render (a mode flip, the menu) never re-renders the
            provider, whose new context value would re-render every m.* below. */}
        <MotionProvider>
          <HeaderLogo />
          <Menu />
        </MotionProvider>
      </HeaderFrame>
    </HeaderStoreProvider>
  );
}
