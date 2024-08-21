import { Suspense } from 'react';

import { cookies } from 'next/headers';

import Logo from './Logo';
import Menu from './Menu/Menu';
import Username from './Menu/Username';

export default function Header() {
  const isAuthenticated = !!cookies().get('sessionId')?.value;

  return (
    <div className="absolute h-[6rem] w-screen md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-stretch">
        <Logo priority />
        <Menu isAuthenticated={isAuthenticated}>
          <Suspense
            fallback={
              <div className="h-[18px] w-14 animate-pulse bg-white/30" />
            }
          >
            <Username />
          </Suspense>
        </Menu>
      </div>
    </div>
  );
}
