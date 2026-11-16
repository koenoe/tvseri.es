import { LANDING_SLUGS } from '@tvseri.es/constants';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  globeGlyph,
  languageGlyph,
  variantTvGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import RowErrorBoundary from '@/components/ui/row/RowErrorBoundary';

import { GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';

import { countryNames } from '../../country/_data/names';
import { languageName } from '../../language/[slug]/_data/language';

import { formatCount, INDEX_END_LINE } from '../landing';
import { networkChips } from './indexChips';
import LandingIndex, {
  LandingIndexChips,
  LandingIndexSkeleton,
} from './LandingIndex';
import { getIndexChips } from './lists';

export type IndexKind = 'country' | 'language' | 'network';

type IndexCopy = Readonly<{
  description: string;
  /** the end card's title */
  end: string;
  glyph: Glyph;
  /** the meta line's noun: "60 countries" */
  noun: string;
  title: string;
}>;

// DRAFT: owner approves (descriptions and end titles)
const COPY: Readonly<Record<IndexKind, IndexCopy>> = {
  country: {
    description:
      'Every country with its own page on tvseri.es: series by where they were made.',
    end: 'That’s every country',
    glyph: globeGlyph,
    noun: 'countries',
    title: 'Countries',
  },
  language: {
    description:
      'Every language with its own page on tvseri.es: series by the language they were made in.',
    end: 'That’s every language',
    glyph: languageGlyph,
    noun: 'languages',
    title: 'Languages',
  },
  network: {
    description:
      'Every network with its own page on tvseri.es, from AMC to ZDF.',
    end: 'That’s every network',
    glyph: variantTvGlyph,
    noun: 'networks',
    title: 'Networks',
  },
};

/** An index page's metadata */
export const indexMetadata = (kind: IndexKind): Metadata => ({
  description: COPY[kind].description,
  title: COPY[kind].title,
});

/** The count's place while it loads, or when the list is unavailable: a bar the width of "24 countries" */
const COUNT_GHOST = (
  <span
    aria-hidden
    className={cn('block h-5 w-24 rounded-8', GHOST_LOOK.loading)}
  />
);

/** The landings' English names, A to Z: the chips' labels before the list is known (the list is these, cut by the ones with shows) */
const landingLabels = (kind: ListKind): ReadonlyArray<string> =>
  LANDING_SLUGS[kind]
    .map((slug) =>
      kind === 'country'
        ? countryNames(slug).name
        : (languageName(slug)?.english ?? slug),
    )
    .sort((a, b) => a.localeCompare(b, 'en'));

type ListKind = Exclude<IndexKind, 'network'>;

/** The count; when the list is unavailable, its place stays */
async function Count({ kind }: Readonly<{ kind: ListKind }>) {
  const chips = await getIndexChips(kind);
  if (isUnavailable(chips)) {
    return COUNT_GHOST;
  }
  return `${formatCount(chips.length)} ${COPY[kind].noun}`;
}

async function Chips({ kind }: Readonly<{ kind: ListKind }>) {
  const chips = await getIndexChips(kind);
  if (isUnavailable(chips)) {
    return (
      <LandingIndexSkeleton
        labels={landingLabels(kind)}
        look="failed"
        title={COPY[kind].title}
      />
    );
  }
  return <LandingIndexChips chips={chips} />;
}

/**
 * `/country`, `/language`, `/network`: every landing of a kind as a chip.
 * Countries and languages are TMDB's list cut by the landing counts (cached
 * loaders, streamed); networks are `NETWORKS`, static.
 */
export default function IndexPage({ kind }: Readonly<{ kind: IndexKind }>) {
  const copy = COPY[kind];
  const end = { line: INDEX_END_LINE, title: copy.end };
  if (kind === 'network') {
    const chips = networkChips();
    const meta = `${formatCount(chips.length)} ${copy.noun}`;
    return (
      <LandingIndex
        end={end}
        meta={meta}
        metaGlyph={copy.glyph}
        title={copy.title}
      >
        <LandingIndexChips chips={chips} />
      </LandingIndex>
    );
  }
  const count = (
    <Suspense fallback={COUNT_GHOST}>
      <Count kind={kind} />
    </Suspense>
  );
  const skeleton = (
    <LandingIndexSkeleton labels={landingLabels(kind)} title={copy.title} />
  );
  return (
    <LandingIndex
      end={end}
      meta={count}
      metaGlyph={copy.glyph}
      title={copy.title}
    >
      <RowErrorBoundary id="landing-index" title={copy.title}>
        <Suspense fallback={skeleton}>
          <Chips kind={kind} />
        </Suspense>
      </RowErrorBoundary>
    </LandingIndex>
  );
}
