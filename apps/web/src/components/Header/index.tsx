import Logo from '../Logo';
import Menu from '../Menu/Menu';
import Username from '../Menu/Username';
import { HeaderStoreProvider } from './HeaderStoreProvider';
import MorphingHeader from './MorphingHeader';

// No session read here: the menu shows the user from a display-only cookie on
// the client, so the header is part of the static shell of cached pages.
export default function Header() {
  return (
    <HeaderStoreProvider>
      <MorphingHeader>
        <Logo priority />
        <Menu>
          <Username />
        </Menu>
      </MorphingHeader>
    </HeaderStoreProvider>
  );
}
