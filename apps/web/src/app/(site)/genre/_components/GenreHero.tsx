import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { seasonGlyph, tagGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { isUnavailable } from '@/lib/cache/unavailable';
import landingPath from '@/lib/routing/landingPath';

import { getLandingFacts } from '../../_discover/data/facts';
import {
  formatShows,
  keywordLabel,
  LandingChips,
  LandingCrumb,
  LandingFacts,
  LandingHero,
  LandingHeroDetailsSkeleton,
  LandingLine,
  LandingTitle,
} from '../../_discover/landing';
import { genreFacts, oftenWith } from '../_data/genreHero';
import { genreLine } from '../_data/genreLines';
import { genreForSlug } from './genreSlug';

const TITLE_ID = 'genre-title';

/**
 * The genre hero, typographic: the genre is the page name and the biggest
 * thing on it; then the meta line, the genre's line, four facts and the
 * sub-genre chips (each a theme landing). No show's backdrop or buttons.
 * The crumb, the name and the line need no API; the facts come from a
 * cached loader (`GenreHeroDetails`). All of it prerenders per slug.
 */
export default async function GenreHero({
  glow,
  params,
}: Readonly<{
  /** the genre's glow (`genreLook`) */
  glow?: string;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const genre = genreForSlug(slug);
  const line = <LandingLine>{genreLine(slug)}</LandingLine>;
  return (
    <LandingHero glow={glow} labelledBy={TITLE_ID}>
      <LandingCrumb label="Genres" />
      <LandingTitle id={TITLE_ID} name={genre.name}>
        {genre.name}
      </LandingTitle>
      <Suspense fallback={<LandingHeroDetailsSkeleton facts={4} line={line} />}>
        <GenreHeroDetails line={line} slug={slug} />
      </Suspense>
    </LandingHero>
  );
}

async function GenreHeroDetails({
  line,
  slug,
}: Readonly<{ line: ReactNode; slug: string }>) {
  const facts = await getLandingFacts('genre', slug);
  if (isUnavailable(facts)) {
    return <LandingHeroDetailsSkeleton facts={4} line={line} look="failed" />;
  }
  if (facts?.type !== 'genre') {
    notFound();
  }
  const often = oftenWith(facts);
  const chips = facts.subGenres.map((chip) => ({
    href: landingPath('theme', chip.slug),
    label: keywordLabel(chip.name),
  }));
  const factCards = genreFacts(facts);
  return (
    <>
      <MetaRow className="mt-2">
        <MetaItem icon={seasonGlyph}>{formatShows(facts.count)}</MetaItem>
        {often ? (
          <MetaItem icon={tagGlyph} shrink title={often.desktop}>
            <span className="md:hidden">{often.phone}</span>
            <span className="max-md:hidden">{often.desktop}</span>
          </MetaItem>
        ) : null}
      </MetaRow>
      {line}
      <LandingFacts facts={factCards} />
      <LandingChips chips={chips} />
    </>
  );
}
