import { Suspense } from 'react';

import LoginButtonContainer from './Buttons/LoginButtonContainer';
import Logo from './Logo';
import Search from './Search/Search';

export default function Header() {
  return (
    <div className="absolute z-10 h-[6rem] w-screen md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-stretch">
        <Logo priority />
        <div className="ml-auto flex items-center gap-8">
          <Suspense
            fallback={
              <div className="h-[18px] w-20 animate-pulse bg-white/30" />
            }
          >
            <LoginButtonContainer />
          </Suspense>
          <Search />
        </div>
      </div>
    </div>
  );
}
