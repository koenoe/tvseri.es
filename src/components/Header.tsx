import { Suspense } from 'react';

import Logo from './Logo';
import MenuContainer from './Menu/MenuContainer';

export default function Header() {
  return (
    <div className="absolute h-[6rem] w-screen md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-stretch">
        <Logo priority />
        <Suspense
          fallback={
            <div className="relative z-10 ml-auto flex gap-5">
              <div className="h-[24px] w-[24px] animate-pulse bg-white/30" />
              <div className="h-[24px] w-[24px] animate-pulse bg-white/30" />
            </div>
          }
        >
          <MenuContainer />
        </Suspense>
      </div>
    </div>
  );
}
