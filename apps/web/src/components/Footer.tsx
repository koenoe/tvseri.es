import Image from 'next/image';
import Link from 'next/link';

import Github from '@/assets/github.svg';
import JustWatch from '@/assets/justwatch.svg';
import Tmdb from '@/assets/tmdb.svg';

import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="relative mt-auto flex h-[12rem] w-full items-center">
      <div className="container z-10 flex w-full items-start gap-4">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="text-xs leading-loose opacity-60">
            This site uses data from
            <Link
              className="mx-1 inline-flex items-center"
              href="https://themoviedb.org"
              prefetch={false}
              target="_blank"
            >
              <Image alt="TMDb" height={10} src={Tmdb} width={66} />
            </Link>
            and streaming availability from
            <Link
              className="mx-1 inline-flex items-center"
              href="https://www.justwatch.com/"
              prefetch={false}
              target="_blank"
            >
              <Image alt="JustWatch" height={10} src={JustWatch} width={66} />
            </Link>
            but is neither certified nor endorsed by them.
          </p>
        </div>
        <Link
          className="ml-auto shrink-0"
          href="https://github.com/koenoe/tvseri.es"
          prefetch={false}
          target="_blank"
        >
          <Image alt="Github" height={20} src={Github} width={20} />
        </Link>
      </div>
      <div className="z-5 pointer-events-none absolute inset-0 h-full w-full bg-black/5" />
    </footer>
  );
}
