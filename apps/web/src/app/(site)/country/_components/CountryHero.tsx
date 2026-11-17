import type { ReactNode } from 'react';
import { Suspense } from 'react';

import {
  globeGlyph,
  languageGlyph,
  seasonGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { isUnavailable } from '@/lib/cache/unavailable';
import type { CountryNames } from '../../_discover/data/countryNames';
import { getLandingFacts } from '../../_discover/data/facts';
import {
  formatShows,
  LandingCrumb,
  LandingShowCountSkeleton,
  LandingTitle,
  TITLE_SPACE,
  TitleLineGhost,
} from '../../_discover/landing';

const TITLE_ID = 'country-title';

const countryCrumb = <LandingCrumb href="/country" label="Countries" />;

/**
 * The hero's frame: it ends 600 from the top of the
 * page on desktop (the design's 60 header + 540; ours is 80 tall, so 520),
 * the text at its foot over the map; on a phone the crumb starts 274 under
 * the header, below the smaller map.
 */
function CountryHeroFrame({
  children,
  labelledBy,
}: Readonly<{ children: ReactNode; labelledBy: string }>) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="mx-auto flex w-full max-w-page flex-col items-start px-gutter pt-[274px] md:h-[520px] md:justify-end md:pt-0 md:pb-6"
    >
      {children}
    </section>
  );
}

/** "7,240 shows": the landing's count, the only part of the hero from the API */
async function ShowCount({ slug }: Readonly<{ slug: string }>) {
  const facts = await getLandingFacts('country', slug);
  if (isUnavailable(facts)) {
    return <LandingShowCountSkeleton look="failed" />;
  }
  return facts ? formatShows(facts.count) : null;
}

/**
 * The country hero ("On the map"): the crumb, the country's name (and its
 * own-language name in white 40%), and the meta line (code, count, "Mostly
 * in English"; the language is dropped on a phone). All
 * of it comes from the code but the count (a cached loader); it all
 * prerenders per slug.
 */
export default function CountryHero({
  names,
  slug,
}: Readonly<{ names: CountryNames; slug: string }>) {
  return (
    <CountryHeroFrame labelledBy={TITLE_ID}>
      {countryCrumb}
      <LandingTitle id={TITLE_ID} name={names.name}>
        {names.name}
        {names.native ? (
          <span
            className="ml-4 text-white/60 max-md:ml-0 max-md:block"
            lang={names.language}
          >
            {names.native}
          </span>
        ) : null}
      </LandingTitle>
      <MetaRow className="mt-2">
        <MetaItem icon={globeGlyph}>{names.code}</MetaItem>
        <MetaItem icon={seasonGlyph} title="Series">
          <Suspense fallback={<LandingShowCountSkeleton />}>
            <ShowCount slug={slug} />
          </Suspense>
        </MetaItem>
        <MetaItem className="max-md:hidden" icon={languageGlyph}>
          {names.languageName ? `Mostly in ${names.languageName}` : null}
        </MetaItem>
      </MetaRow>
    </CountryHeroFrame>
  );
}

/** The hero's ghosts are still (no pulse) */
const FILL = 'bg-white/5';
const BAR = `block rounded-8 ${FILL}`;

/** The hero before the code is known (the shell of every country) */
export function CountryHeroSkeleton() {
  return (
    <CountryHeroFrame labelledBy="country-loading">
      {countryCrumb}
      <h1 className="sr-only" id="country-loading">
        Loading
      </h1>
      {/* the title's lines, each a bar in its line box, with the title's margins */}
      <span aria-hidden className={`flex flex-col ${TITLE_SPACE}`}>
        <TitleLineGhost fill={FILL} width="w-64 md:w-96" />
        {/* most countries have a name of their own, which is a second line on a phone */}
        <TitleLineGhost className="md:hidden" fill={FILL} width="w-40" />
      </span>
      <span aria-hidden className={`${BAR} mt-2 h-5 w-56`} />
    </CountryHeroFrame>
  );
}
