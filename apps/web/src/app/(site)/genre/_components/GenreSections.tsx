import { calendarGlyph, trendingGlyph } from '@/components/ui/icon/glyphs';
import GuardedSection from '@/components/ui/row/GuardedSection';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import { isUnavailable } from '@/lib/cache/unavailable';

import {
  END_LINE,
  LandingChipRow,
  LandingEndCard,
  LandingRow,
  LandingRowSlot,
  LandingSections,
  LandingStart,
  RankedList,
  RankedListSkeleton,
  WhereToStartSkeleton,
} from '../../_discover/landing';
import { SwitchGhost } from '../../_discover/landing/skeletons';
import { bestTitle } from '../_data/bestTitle';
import {
  GENRE_ROW,
  genreKindTabs,
  genreRows,
  getBestInGenre,
} from '../_data/rows';
import { genreForSlug } from './genreSlug';

/**
 * The page's place before the slug is known (the cached shell of a genre
 * nobody has visited): every section, the titles that come with the
 * genre's name as bars.
 */
export function GenreSectionsSkeleton() {
  return (
    <LandingSections placeholder>
      <RowSkeleton id="trending" look="landing" title="Trending" titleGhost />
      <WhereToStartSkeleton />
      <RowSkeleton
        id="kind"
        look="landing"
        switcher={<SwitchGhost />}
        title="By kind"
        titleGhost
      />
      <RowSkeleton id="fresh" look="landing" title="New in" titleGhost />
      <RankedListSkeleton />
      <LandingEndCard line={END_LINE.genre} title="" titleGhost />
    </LandingSections>
  );
}

/**
 * Everything under the genre hero: Trending, Where to start, by
 * kind (tabs), New in, the 50 best and the end card. Each streams on its own
 * and never repeats a show of a row above it.
 */
export default async function GenreSections({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const genre = genreForSlug(slug);
  const lower = genre.name.toLowerCase();
  const rows = genreRows(slug);
  const titles = {
    best: bestTitle(lower, 50),
    fresh: `New in ${lower}`,
    kind: `${genre.name} by kind`,
    trending: `Trending in ${genre.name}`,
  };
  const kindSwitchLabel = `Kind of ${lower}`;
  const endTitle = `That’s the best of ${lower}`;
  return (
    <LandingSections>
      <LandingRowSlot id="trending" title={titles.trending}>
        <LandingRow
          id="trending"
          index={GENRE_ROW.trending}
          loaders={rows}
          subtitle="This week on TMDB"
          subtitleGlyph={trendingGlyph}
          title={titles.trending}
        />
      </LandingRowSlot>
      <GuardedSection
        fallback={<WhereToStartSkeleton />}
        id="start"
        title="Where to start"
      >
        <LandingStart
          by="genre"
          index={GENRE_ROW.start}
          loaders={rows}
          value={slug}
        />
      </GuardedSection>
      <LandingRowSlot id="kind" switcher title={titles.kind}>
        <LandingChipRow
          id="kind"
          index={GENRE_ROW.kind}
          loaders={rows}
          loadTabs={genreKindTabs}
          slug={slug}
          switchLabel={kindSwitchLabel}
          title={titles.kind}
        />
      </LandingRowSlot>
      <LandingRowSlot id="fresh" title={titles.fresh}>
        <LandingRow
          id="fresh"
          index={GENRE_ROW.fresh}
          loaders={rows}
          subtitle="First aired in the last 12 months"
          subtitleGlyph={calendarGlyph}
          title={titles.fresh}
        />
      </LandingRowSlot>
      <GuardedSection
        fallback={<RankedListSkeleton title={titles.best} />}
        id="best"
        title={titles.best}
      >
        <GenreBest lower={lower} slug={slug} title={titles.best} />
      </GuardedSection>
      <LandingEndCard line={END_LINE.genre} title={endTitle} />
    </LandingSections>
  );
}

async function GenreBest({
  lower,
  slug,
  title,
}: Readonly<{ lower: string; slug: string; title: string }>) {
  const items = await getBestInGenre(slug);
  if (isUnavailable(items)) {
    return <RankedListSkeleton look="failed" title={title} />;
  }
  const listTitle = bestTitle(lower, items.length);
  return (
    <RankedList
      id="best"
      items={items}
      subtitle="Highest rated on TMDB, 1,000+ votes"
      title={listTitle}
    />
  );
}
