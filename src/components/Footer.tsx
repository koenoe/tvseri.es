import Image from 'next/image';
import Link from 'next/link';

import logo from '@/assets/logo.svg';

export default function Footer() {
  return (
    <footer className="relative flex h-[12rem] w-full items-center transition-colors duration-500">
      <div className="container flex flex-col gap-4">
        <Link href="/">
          <Image src={logo} alt="" width={150} />
        </Link>
        <p className="text-xs leading-loose opacity-60">
          This product uses the TMDb API but is neither endorsed nor certified
          by{' '}
          <a
            href="https://themoviedb.org"
            target="_blank"
            className="underline"
          >
            TMDb
          </a>
          . Information on watch providers is courtesy of{' '}
          <a
            href="https://www.justwatch.com/"
            target="_blank"
            className="underline"
          >
            JustWatch
          </a>
          .
        </p>
      </div>
      <div className="absolute inset-0 h-full w-full bg-black/5" />
    </footer>
  );
}
