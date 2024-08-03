import Image from 'next/image';

import logo from '@/assets/logo.svg';
import searchIcon from '@/assets/search.svg';

export default async function Header() {
  return (
    <div className="absolute z-10 h-[6rem] w-full md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-between">
        <Image src={logo} alt="" width={150} />
        <Image src={searchIcon} alt="" width={24} />
      </div>
    </div>
  );
}
