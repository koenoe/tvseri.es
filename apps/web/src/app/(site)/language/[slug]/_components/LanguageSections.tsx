import { notFound } from 'next/navigation';

import { userGlyph } from '@/components/ui/icon/glyphs';
import GuardedSection from '@/components/ui/row/GuardedSection';
import { GHOST_LOOK, GhostLine } from '@/components/ui/row/RowGhosts';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import { languageName } from '../../../_discover/data/languageName';
import {
  END_LINE,
  LandingEndCard,
  LandingRow,
  LandingRowSlot,
  LandingSections,
  type PlaceholderLook,
  SectionPlaceholder,
} from '../../../_discover/landing';
import { getTitleWall, languageRows } from '../_data/loaders';
import TitleWall from './TitleWall';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/**
 * A title card's lines while it loads (`TitleCard`): the title (title-2),
 * the other script's line and the meta row at the bottom, each a bar in its
 * line box
 */
function TitleCardGhost() {
  return (
    <>
      <GhostLine className="h-7 md:h-8" inPulse look="loading" width="w-3/4" />
      <GhostLine
        className="mt-1 h-5 md:mt-2"
        inPulse
        look="loading"
        width="w-1/2"
      />
      <GhostLine className="mt-auto h-5" inPulse look="loading" width="w-2/5" />
    </>
  );
}

/** The wall's place while it loads (or failed): its title and two rows of cards */
function TitleWallSkeleton({
  look = 'loading',
  title,
}: Readonly<{ look?: PlaceholderLook; title?: string }>) {
  const card = cn(
    'flex h-[139px] flex-col rounded-14 px-4 pt-5 pb-3.5 md:h-48 md:rounded-16 md:px-6 md:pt-7 md:pb-5',
    GHOST_LOOK[look],
  );
  return (
    <SectionPlaceholder
      headingClass="min-h-8"
      look={look}
      name="wall"
      title={title}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 8 }, (_, index) => (
          <span
            aria-hidden
            className={card}
            data-placeholder="wall-card"
            key={index}
          >
            {look === 'loading' ? <TitleCardGhost /> : null}
          </span>
        ))}
      </div>
    </SectionPlaceholder>
  );
}

/** The page's place before the slug is known: Start here (a static title), the wall, the end card */
export function LanguageSectionsSkeleton() {
  return (
    <LandingSections placeholder start="loose">
      <RowSkeleton id="start" look="landing" title="Start here" />
      <TitleWallSkeleton />
      <LandingEndCard line={END_LINE.language} title="" titleGhost />
    </LandingSections>
  );
}

/** The wall's cards, in the prerendered shell; the failed look while the API can't answer */
async function Wall({
  lang,
  title,
}: Readonly<{ lang: string; title: string }>) {
  const cards = await getTitleWall(lang);
  if (isUnavailable(cards)) {
    return <TitleWallSkeleton look="failed" title={title} />;
  }
  return cards.length > 0 ? (
    <TitleWall cards={cards} lang={lang} title={title} />
  ) : null;
}

/**
 * Below the hero: Start here (the five most-rated, the only
 * poster row), the title wall without them, and the end card with only
 * "Back to Discover".
 */
export default async function LanguageSections({ params }: Props) {
  const { slug } = await params;
  const language = languageName(slug);
  if (!language) {
    notFound();
  }
  const wallTitle = `More in ${language.english}`;
  const skeleton = <TitleWallSkeleton title={wallTitle} />;
  return (
    <LandingSections start="loose">
      <LandingRowSlot id="start" title="Start here">
        <LandingRow
          id="start"
          index={0}
          loaders={languageRows(slug)}
          subtitle="Most rated"
          subtitleGlyph={userGlyph}
          title="Start here"
        />
      </LandingRowSlot>
      <GuardedSection fallback={skeleton} id="wall" title={wallTitle}>
        <Wall lang={slug} title={wallTitle} />
      </GuardedSection>
      <LandingEndCard
        line={END_LINE.language}
        title={`That’s ${language.english}`}
      />
    </LandingSections>
  );
}
