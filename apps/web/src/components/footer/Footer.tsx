import Link from 'next/link';

import {
  arrowUpGlyph,
  codeGlyph,
  externalGlyph,
  shieldGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import Logo from '@/components/ui/Logo';

import { JustWatchLogo, TmdbLogo } from './CreditLogos';
import FooterToastClearance from './FooterToastClearance';

const REPO_URL = 'https://github.com/koenoe/tvseri.es';

/** The logo links: a 10px logo, a 24px hit area (WCAG 2.5.8) */
const CREDIT =
  "relative mx-1 inline-flex items-center rounded-2 text-white opacity-60 transition-opacity duration-150 after:absolute after:-inset-y-[7px] after:inset-x-0 after:content-[''] hover:opacity-100";
/** OMDb has no logo to set: its name, underlined as the footer's links are */
const TEXT_CREDIT =
  'rounded-2 underline decoration-white/17 underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/60';
const LINK =
  'group inline-flex h-11 items-center gap-1.5 rounded-4 text-meta text-white/80 transition-colors duration-150 hover:text-white md:h-8';
const LINK_LABEL =
  'underline decoration-white/28 underline-offset-4 transition-[text-decoration-color] duration-150 group-hover:decoration-white';
const LINK_ICON = 'text-white/60 transition-colors group-hover:text-white';
const TOP =
  'ml-auto inline-flex h-11 items-center gap-1.5 rounded-full bg-white/8 pr-4 pl-3.5 text-meta font-medium text-white/80 ring-1 ring-white/10 ring-inset transition-colors duration-150 hover:bg-white/14 hover:text-white md:ml-0 md:h-8 md:pr-3 md:pl-2.5';

/**
 * The site footer. OMDb is credited by name: its CC BY-NC 4.0 licence asks
 * for credit. The band's colour is painted by BackgroundStyle
 * (`[data-site-footer]`). Static: no data, one empty client island. Top is
 * the document's `#top` (the HTML spec scrolls to the top when no element
 * has that id). Not shown under an error view (`ErrorState`).
 */
export default function Footer() {
  return (
    <>
      {/* The air above the band, the same under every page:
          64px from 768, 48 on a phone. Pages end on their last content, no bottom padding. */}
      <div
        aria-hidden="true"
        className="pointer-events-none mt-auto h-12 shrink-0 md:h-16"
        data-footer-air=""
      />
      <footer className="relative w-full" data-site-footer>
        <FooterToastClearance />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/5"
        />
        <div className="relative mx-auto flex w-full max-w-page flex-col gap-3 px-gutter pt-12 pb-[calc(16px+env(safe-area-inset-bottom))] md:flex-row md:items-start md:gap-8 md:pt-14 md:pb-8 lg:pt-16 lg:pb-10">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex h-5 items-center">
              <Logo size={18} />
            </div>
            <Credits />
          </div>
          <div className="flex w-full items-center gap-5 md:-mt-1.5 md:ml-auto md:w-auto md:shrink-0">
            <a
              className={LINK}
              href={REPO_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon className={LINK_ICON} glyph={codeGlyph} size={13} />
              <span className={LINK_LABEL}>GitHub</span>
              {/* contrast-exempt: the external-link icon */}
              <Icon className="text-white/40" glyph={externalGlyph} size={13} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <Link className={LINK} href="/privacy">
              <Icon className={LINK_ICON} glyph={shieldGlyph} size={13} />
              <span className={LINK_LABEL}>Privacy</span>
            </Link>
            <a className={TOP} href="#top">
              <Icon glyph={arrowUpGlyph} size={13} />
              Top
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

/**
 * The credits sentence plus the OMDb credit. The logos rest at the line's
 * strength and come up to full white on hover, as the text links do.
 * `text-balance`: a wrapped sentence never leaves one word on its last line.
 */
function Credits() {
  return (
    <p className="text-balance text-caption leading-6 text-white/60">
      This site uses data from{' '}
      <a
        aria-label="TMDB"
        className={CREDIT}
        href="https://www.themoviedb.org"
        rel="noopener noreferrer"
        target="_blank"
      >
        <TmdbLogo className="block h-2.5 w-[77px]" />
      </a>
      {/* the comma sits against the logo, not after its 4px margin */}
      <span className="-ml-1">,</span> ratings from{' '}
      {/* the licence stays on the line of what it licenses */}
      <span className="whitespace-nowrap">
        <a
          className={TEXT_CREDIT}
          href="https://www.omdbapi.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          OMDb
        </a>{' '}
        (
        <a
          className={TEXT_CREDIT}
          href="https://creativecommons.org/licenses/by-nc/4.0/"
          rel="noopener noreferrer"
          target="_blank"
        >
          CC BY-NC 4.0
        </a>
        )
      </span>{' '}
      and streaming availability from{' '}
      <a
        aria-label="JustWatch"
        className={CREDIT}
        href="https://www.justwatch.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        <JustWatchLogo className="block h-2.5 w-[66px]" />
      </a>{' '}
      but is neither certified nor endorsed by them.
    </p>
  );
}
