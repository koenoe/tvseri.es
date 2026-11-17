import { landingFilter } from '@tvseri.es/constants';
import { notFound } from 'next/navigation';

import { isUnavailable } from '@/lib/cache/unavailable';
import { countryNames } from '../../_discover/data/countryNames';
import { getLandingColour } from '../../_discover/data/leadColour';
import { getWhereToStart } from '../../_discover/data/whereToStart';
import { LandingPage, LandingShell } from '../../_discover/landing';
import { landingLook } from '../../_discover/landing/landingLook';
import CountryDotMap from './CountryDotMap';
import CountryHero, { CountryHeroSkeleton } from './CountryHero';
import CountrySections, { CountrySectionsSkeleton } from './CountrySections';

/** The designed grounds; every other country takes its favourite show's (`countryGround`) */
const GROUNDS: Readonly<Record<string, string>> = {
  dk: '#161c20',
  kr: '#171a21',
};
const DEFAULT_GROUND = '#171b1f';

/**
 * A country without a designed ground stands on its own ground, from its
 * favourite show (Where to start's first, the same cached picks), so every
 * landing is its own; the UK's ground when it has none. No cache scope of its
 * own: the cached reads' lives set the page's (see `genreLook`).
 */
async function countryGround(code: string): Promise<string> {
  const picks = await getWhereToStart('country', code);
  // the favourite first, then its backups (the next most-voted)
  const ids = isUnavailable(picks)
    ? []
    : picks.filter((pick) => pick.kind === 'favourite').map((pick) => pick.id);
  const colour = await getLandingColour(ids);
  return landingLook(colour, { ground: DEFAULT_GROUND }).ground;
}

/** A country landing's slug: a lower-case ISO 3166-1 code with a landing */
export const isCountrySlug = (slug: string) =>
  slug === slug.toLowerCase() && Boolean(landingFilter('country', slug));

/** The page before the slug is known: no colour of its own (`LandingShell`), the crumb, the rows' place */
export function CountryLandingShell() {
  return (
    <LandingShell>
      <CountryHeroSkeleton />
      <CountrySectionsSkeleton />
    </LandingShell>
  );
}

/**
 * `/country/{code}`: the dotted world window behind
 * the title (static SVG, desktop 1440 × 600 under the header, phone 390 ×
 * 420 from the top of the screen), the hero, then the sections.
 */
export default async function CountryLanding({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  if (!isCountrySlug(slug)) {
    notFound();
  }
  const names = countryNames(slug);
  const ground = GROUNDS[slug] ?? (await countryGround(names.code));
  return (
    <LandingPage ground={ground}>
      {/* clipped at the window's sides: the 1440 map never widens the page */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-x-clip">
        <CountryDotMap
          className="absolute top-0 left-1/2 -ml-[720px] max-md:hidden"
          code={slug}
          variant="desktop"
        />
        <CountryDotMap
          className="absolute -top-[95px] left-0 md:hidden"
          code={slug}
          variant="phone"
        />
      </div>
      <CountryHero names={names} slug={slug} />
      <CountrySections names={names} slug={slug} />
    </LandingPage>
  );
}
