import Image from 'next/image';
import Link from 'next/link';

import JustWatch from '@/assets/justwatch.svg';
import Tmdb from '@/assets/tmdb.svg';

import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="relative mt-auto flex h-[12rem] w-full items-center">
      <div className="container z-10 flex flex-col gap-4">
        <Logo />
        <p className="text-xs leading-loose opacity-60">
          This site uses data from
          <Link
            href="https://themoviedb.org"
            target="_blank"
            className="mx-1 inline-flex items-center"
            prefetch={false}
          >
            <Image src={Tmdb} alt="TMDb" width={66} height={10} />
          </Link>
          and streaming availability from
          <Link
            href="https://www.justwatch.com/"
            target="_blank"
            className="mx-1 inline-flex items-center"
            prefetch={false}
          >
            <Image src={JustWatch} alt="JustWatch" width={66} height={10} />
          </Link>
          but is neither certified nor endorsed by them.
        </p>
      </div>
      <div className="z-5 absolute inset-0 h-full w-full bg-black/5" />
    </footer>
  );
}
