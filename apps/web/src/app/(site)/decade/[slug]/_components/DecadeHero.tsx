import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { calendarGlyph, userGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';

import {
  LandingCrumb,
  LandingShowCount,
  LandingShowCountSkeleton,
  LandingTitle,
  PlainHeadingSkeleton,
  PlainHeroFrame,
} from '../../../_discover/landing';
import { decadeOf } from '../_data/loaders';

const TITLE_ID = 'decade-title';

const crumb = <LandingCrumb label="Decades" />;

/** The hero's frame: the crumb, then the title and meta line (`children`) */
export function DecadeHeroFrame({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <PlainHeroFrame crumb={crumb} labelledBy={TITLE_ID}>
      {children}
    </PlainHeroFrame>
  );
}

/** The title and meta line's place while the slug resolves */
export function DecadeHeadingSkeleton() {
  return <PlainHeadingSkeleton id={TITLE_ID} />;
}

/**
 * "2010s" and its meta line: the years, the decade's shows (desktop; the
 * one part that needs the API, streamed in) and how the map is sized ("By
 * votes" on a phone). The rest needs no API call: cached shell.
 */
export async function DecadeHeading({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const decade = decadeOf(slug);
  if (!decade) {
    notFound();
  }
  const countSkeleton = <LandingShowCountSkeleton className="max-md:hidden" />;
  return (
    <>
      <LandingTitle id={TITLE_ID} name={decade.label}>
        {decade.label}
      </LandingTitle>
      <MetaRow className="mt-2">
        <MetaItem icon={calendarGlyph}>
          {`${decade.from} to ${decade.to}`}
        </MetaItem>
        <Suspense fallback={countSkeleton}>
          <LandingShowCount
            className="max-md:hidden"
            slug={slug}
            type="decade"
          />
        </Suspense>
        <MetaItem icon={userGlyph}>
          <span className="md:hidden">By votes</span>
          <span className="max-md:hidden">
            Sized by how many people rated them
          </span>
        </MetaItem>
      </MetaRow>
    </>
  );
}
