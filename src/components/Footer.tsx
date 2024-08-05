import Image from 'next/image';
import Link from 'next/link';

import logo from '@/assets/logo.svg';

export default function Footer() {
  return (
    <footer className="relative flex h-[12rem] w-full items-center">
      <div className="container z-10 flex flex-col gap-4">
        <Link href="/">
          <Image src={logo} alt="" width={150} />
        </Link>
        <p className="text-xs leading-loose opacity-60">
          This website uses the TMDb API but is neither endorsed nor certified
          by{' '}
          <Link
            href="https://themoviedb.org"
            target="_blank"
            className="underline"
            prefetch={false}
          >
            TMDb
          </Link>
          . The information on watch providers is courtesy of{' '}
          <Link
            href="https://www.justwatch.com/"
            target="_blank"
            className="underline"
            prefetch={false}
          >
            JustWatch
          </Link>
          .
        </p>
      </div>
      <div className="z-5 absolute inset-0 h-full w-full bg-black/5" />
    </footer>
  );
}
