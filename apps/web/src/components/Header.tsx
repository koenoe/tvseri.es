import { Suspense } from 'react';

import auth from '@/auth';

import Logo from './Logo';
import Menu from './Menu/Menu';
import Username from './Menu/Username';

export default function Header() {
  const authPromise = auth();

  return (
    <div className="absolute h-[6rem] w-screen md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-stretch">
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
      </div>
    </div>
  );
}
