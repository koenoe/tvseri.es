import { starGlyph } from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import GuardedSection from '@/components/ui/row/GuardedSection';
import RowSkeleton from '@/components/ui/row/RowSkeleton';

import {
  END_LINE,
  LandingChipRow,
  LandingEndCard,
  LandingRow,
  LandingRowSlot,
  LandingSections,
  LandingStart,
  WhereToStartSkeleton,
} from '../../_discover/landing';
import { SwitchGhost } from '../../_discover/landing/skeletons';
import { THEME_ROW, themeNextTabs, themeRows } from '../_data/rows';
import { bestTitle, themeLower } from '../_data/themeCopy';
import { themeForSlug } from './themeSlug';

/** The star's outline (a row subtitle takes a plain glyph) */
const STAR: Glyph = { outline: starGlyph.outline };

/** The page's place before the slug is known: every section as drawn, titles from the theme's name as bars */
export function ThemeSectionsSkeleton() {
  return (
    <LandingSections placeholder start="loose">
      <WhereToStartSkeleton />
      <RowSkeleton id="best" look="landing" title="The best" titleGhost />
      <RowSkeleton
        id="next"
        look="landing"
        switcher={<SwitchGhost />}
        title="Next door"
        titleGhost
      />
      <LandingEndCard line={END_LINE.theme} title="" titleGhost />
    </LandingSections>
  );
}

/**
 * Everything under the theme hero: Where to start, the best, Next
 * door (tabs) and the end card. Never repeats the Start here pick or a show
 * of a row above.
 */
export default async function ThemeSections({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const theme = themeForSlug(slug);
  const lower = themeLower(theme.title);
  const rows = themeRows(slug);
  const titles = {
    best: bestTitle(slug, theme.title),
    next: `Next door to ${lower}`,
  };
  return (
    <LandingSections start="loose">
      <GuardedSection
        fallback={<WhereToStartSkeleton />}
        id="start"
        title="Where to start"
      >
        <LandingStart
          by="theme"
          index={THEME_ROW.start}
          loaders={rows}
          value={slug}
        />
      </GuardedSection>
      <LandingRowSlot id="best" title={titles.best}>
        <LandingRow
          id="best"
          index={THEME_ROW.best}
          loaders={rows}
          subtitle="Highest rated, 300+ votes"
          subtitleGlyph={STAR}
          title={titles.best}
        />
      </LandingRowSlot>
      <LandingRowSlot id="next" switcher title={titles.next}>
        <LandingChipRow
          id="next"
          index={THEME_ROW.next}
          loaders={rows}
          loadTabs={themeNextTabs}
          slug={slug}
          switchLabel="Shares the tag"
          title={titles.next}
        />
      </LandingRowSlot>
      <LandingEndCard line={END_LINE.theme} title={`That’s ${lower}`} />
    </LandingSections>
  );
}
