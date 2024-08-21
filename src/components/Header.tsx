import { Suspense } from 'react';

import Logo from './Logo';
import MenuContainer from './Menu/MenuContainer';

export default function Header() {
  return (
    <div className="absolute h-[6rem] w-screen md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-stretch">
        <Logo priority />
        <Suspense>
          <MenuContainer />
        </Suspense>
      </div>
    </div>
  );
}
