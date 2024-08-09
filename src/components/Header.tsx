import Image from 'next/image';
import Link from 'next/link';

import logo from '@/assets/logo.svg';
import searchIcon from '@/assets/search.svg';

export default function Header() {
  return (
    <div className="absolute z-10 h-[6rem] w-full md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-between">
        <Link href="/">
          <Image src={logo} alt="" width={150} height={20} priority />
        </Link>
        <Image src={searchIcon} alt="" width={24} height={24} priority />
      </div>
    </div>
  );
}
