import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
  variantFilmStripGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadSeriesStates } from '@/lib/marking/server/seriesStates';
import landingPath from '@/lib/routing/landingPath';

import { getLandingFacts } from '../../_discover/data/facts';
import {
  formatSeasons,
  formatShows,
  keywordLabel,
  LandingChips,
  LandingCrumb,
  LandingHero,
  LandingHeroDetailsSkeleton,
  LandingTitle,
  Spotlight,
  SpotlightSkeleton,
} from '../../_discover/landing';
import { getThemeSpotlight } from '../_data/rows';
import { mostlyLine } from '../_data/themeCopy';
import { themeForSlug } from './themeSlug';

const TITLE_ID = 'theme-title';

/**
 * The theme hero: title, meta and "Often tagged with" chips on the left,
 * the Start here tile on the right (under the chips on a phone). The crumb
 * and the title come from the theme list; the facts and the tile from cached
 * loaders, each in its own Suspense. All of it prerenders per slug.
 */
export default async function ThemeHero({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const theme = themeForSlug(slug);
  const aside = (
    <Suspense fallback={<SpotlightSkeleton />}>
      <ThemeSpotlight slug={slug} />
    </Suspense>
  );
  return (
    <LandingHero aside={aside} labelledBy={TITLE_ID}>
      <LandingCrumb label="Themes" />
      <LandingTitle id={TITLE_ID} name={theme.title}>
        {theme.title}
      </LandingTitle>
      <Suspense fallback={<LandingHeroDetailsSkeleton chipsHeading />}>
        <ThemeHeroDetails slug={slug} />
      </Suspense>
    </LandingHero>
  );
}

async function ThemeHeroDetails({ slug }: Readonly<{ slug: string }>) {
  const facts = await getLandingFacts('theme', slug);
  if (isUnavailable(facts)) {
    return <LandingHeroDetailsSkeleton chipsHeading look="failed" />;
  }
  if (facts?.type !== 'theme') {
    notFound();
  }
  const mostly = mostlyLine(facts);
  const chips = facts.oftenTaggedWith.map((chip) => ({
    href: landingPath('theme', chip.slug),
    label: keywordLabel(chip.name),
  }));
  return (
    <>
      <MetaRow className="mt-2">
        <MetaItem icon={tagGlyph}>Theme</MetaItem>
        <MetaItem icon={seasonGlyph}>{formatShows(facts.count)}</MetaItem>
        {mostly ? (
          <MetaItem
            className="max-md:hidden"
            icon={variantFilmStripGlyph}
            shrink
          >
            {mostly}
          </MetaItem>
        ) : null}
      </MetaRow>
      <LandingChips chips={chips} heading="Often tagged with" />
    </>
  );
}

async function ThemeSpotlight({ slug }: Readonly<{ slug: string }>) {
  const spotlight = await getThemeSpotlight(slug);
  if (isUnavailable(spotlight)) {
    return <SpotlightSkeleton look="failed" title="Start here" />;
  }
  // a theme with no rated show leaves the hero title-led
  if (!spotlight) {
    return null;
  }
  const seasons =
    spotlight.seasons === null
      ? null
      : formatSeasons(spotlight.seasons, spotlight.episodes ?? 0);
  const meta = (
    <MetaRow>
      <MetaItem icon={calendarGlyph}>{spotlight.year ?? undefined}</MetaItem>
      <MetaItem icon={seasonGlyph}>{seasons ?? undefined}</MetaItem>
      <MetaItem icon={tagGlyph} shrink>
        {spotlight.genre ?? undefined}
      </MetaItem>
    </MetaRow>
  );
  return (
    <Spotlight
      kicker="Start here"
      meta={meta}
      reason={spotlight.reason}
      seasons={seasons}
      show={spotlight.show}
      states={loadSeriesStates([spotlight.show.id])}
    />
  );
}
