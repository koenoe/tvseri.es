import { Suspense } from 'react';

import auth from '@/auth';

import Logo from '../Logo';
import Menu from '../Menu/Menu';
import Username from '../Menu/Username';
import { HeaderStoreProvider } from './HeaderStoreProvider';
import MorphingHeader from './MorphingHeader';

export default function Header() {
  const authPromise = auth();

  return (
    <HeaderStoreProvider>
      <MorphingHeader>
        <Logo priority />
        <Menu authPromise={authPromise}>
          <Suspense
            fallback={
              <div className="h-[18px] w-16 animate-pulse bg-white/30" />
            }
          >
            <Username authPromise={authPromise} />
          </Suspense>
        </Menu>
      </MorphingHeader>
    </HeaderStoreProvider>
  );
}
