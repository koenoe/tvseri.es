import Image from 'next/image';

import searchIcon from '@/assets/search.svg';

import Logo from './Logo';

export default function Header() {
  return (
    <div className="absolute z-10 h-[6rem] w-full md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-between">
        <Logo priority />
        <Image src={searchIcon} alt="" width={24} height={24} priority />
      </div>
    </div>
  );
}
