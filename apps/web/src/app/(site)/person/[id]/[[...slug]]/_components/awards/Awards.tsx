import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { SectionError } from '@/components/ui/row/RowError';
import SectionHead from '@/components/ui/section/SectionHead';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';

import { loadFamilyAndAwards } from '../../_data/loaders';
import { awardCards } from '../../_lib/awards';
import { PERSON_LANE, PERSON_SECTION } from '../layout';
import { AwardsSkeleton } from '../Skeletons';
import { SECTION_LINK } from '../sectionLink';
import AllAwards from './AllAwards';

const SECTION = cn(PERSON_SECTION, 'scroll-mt-20');
const ALL_LINK = cn(SECTION_LINK, 'cursor-pointer');

/**
 * Awards (from Wikidata): a big number per award family, four across on desktop,
 * a 2×2 grid on phones; one family alone takes the whole lane. "All 87
 * nominations" opens the full list. Absent when Wikidata has none.
 */
export default async function Awards({
  id,
  name,
}: Readonly<{ id: number; name: string }>) {
  const data = await loadFamilyAndAwards(id);
  if (isUnavailable(data)) {
    return (
      <SectionError
        inset="flush"
        placeholder={<AwardsSkeleton />}
        state="unavailable"
        title="Awards"
      />
    );
  }
  const { awards } = data;
  const cards = awardCards(awards);
  if (!awards || cards.length === 0) {
    return null;
  }
  const single = cards.length === 1;
  const lane = cn(
    'grid',
    PERSON_LANE,
    single
      ? 'grid-cols-1 px-5 py-5 lg:px-6 lg:py-[22px]'
      : 'grid-cols-2 gap-x-4 gap-y-5 p-5 lg:grid-cols-4 lg:gap-0 lg:px-0 lg:py-[22px]',
  );
  const card = cn(
    'flex min-w-0 flex-col gap-0.5 lg:gap-1',
    !single && 'lg:px-6 lg:not-first:border-l lg:not-first:border-white/6',
  );
  const allLink =
    awards.total > 1 ? (
      <AllAwards className={ALL_LINK} name={name} personId={id}>
        All {awards.total}
        <span className="hidden lg:inline"> nominations</span>
        <Icon glyph={chevronRightGlyph} size={14} />
      </AllAwards>
    ) : null;
  return (
    <section
      aria-labelledby="person-awards"
      className={SECTION}
      data-slot="person-awards"
      id="awards"
    >
      <SectionHead id="person-awards" link={allLink} title="Awards" />
      <div className={lane}>
        {cards.map((item) => (
          <div className={card} key={item.label}>
            <span className="text-numeral tabular-nums">{item.count}</span>
            <span className="text-body-sm font-medium">{item.label}</span>
            {item.detail ? (
              <span className="truncate text-caption text-white/60">
                {item.detail}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
