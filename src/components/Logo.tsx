import Image from 'next/image';
import Link from 'next/link';

import logo from '@/assets/logo.svg';

export default function Logo({
  priority = false,
}: Readonly<{ priority?: boolean }>) {
  return (
    <Link href="/" className="flex items-center gap-4">
      <Image
        className="mt-[-6px]"
        src={logo}
        alt=""
        width={30}
        priority={priority}
        height={30}
      />
      <span className="text-lg font-semibold uppercase leading-none tracking-widest">
        Playground
      </span>
    </Link>
  );
}
