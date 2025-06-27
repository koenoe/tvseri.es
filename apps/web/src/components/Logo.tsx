import Image from 'next/image';
import Link from 'next/link';

import logo from '@/assets/logo.svg';

export default function Logo({
  priority = false,
}: Readonly<{ priority?: boolean }>) {
  return (
    <Link className="z-10 flex items-center gap-4" href="/" replace>
      <Image
        alt=""
        className="mt-[-6px]"
        height={24}
        priority={priority}
        src={logo}
        width={24}
      />
      <span className="text-lg font-semibold uppercase leading-none tracking-widest">
        tvseri.es
      </span>
    </Link>
  );
}
