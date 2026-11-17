'use client';

import { type CSSProperties, memo } from 'react';
import { LATE_FADE } from '@/components/motion/lateFade';
import {
  calendarGlyph,
  variantFilmStripGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import WatchedLabel from '@/components/ui/tile/WatchedLabel';
import cn from '@/lib/cn';
import showPath from '@/lib/routing/showPath';

import { useIsWatched } from '../../../_discover/marking/useWatched';

import { cardTitles, type Script, type TitleCard } from '../_data/language';

/** The Watched label's corner (it arrives after the first paint: fades in) */
const LABEL_CORNER = cn('absolute top-4 right-4', LATE_FADE);

type Props = Readonly<{
  card: TitleCard;
  /** the landing's language (TMDB's code; `cardTitles` makes the `lang`s) */
  lang: string;
  script: Script;
}>;

/**
 * A card of the title wall: the
 * coloured top rule, the title in the chosen script (title-2, two lines at
 * most), the other title below (always, as the design draws it), then
 * year · Animation/Live action (the phone keeps the year).
 */
function TitleWallCard({ card, lang, script }: Props) {
  const watched = useIsWatched(card.id);
  const titles = cardTitles(card, script, lang);
  const rule: CSSProperties = { background: card.color };
  const href = showPath(card.id, card.slug);
  return (
    <li>
      <TileLink
        className="relative flex h-full min-h-33 flex-col overflow-hidden rounded-14 bg-white/4 px-4 pt-5 pb-3.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] transition-colors duration-200 hover:bg-white/8 md:min-h-48 md:rounded-16 md:px-6 md:pt-7 md:pb-5"
        data-slot="wall-card"
        href={href}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={rule}
        />
        <span
          className="line-clamp-2 text-title-2 text-white"
          lang={titles.lang}
        >
          {titles.title}
        </span>
        <span
          className="mt-1 truncate text-meta text-white/60 md:mt-2"
          lang={titles.otherLang}
        >
          {titles.other}
        </span>
        {/* a narrow card drops the kind whole rather than cut it */}
        <div className="mt-auto pt-3 md:pt-4">
          <MetaRow fit="drop">
            <MetaItem icon={calendarGlyph}>{card.year}</MetaItem>
            <MetaItem className="max-md:hidden" icon={variantFilmStripGlyph}>
              {card.kind}
            </MetaItem>
          </MetaRow>
        </div>
        {watched ? (
          <span className={LABEL_CORNER}>
            <WatchedLabel />
          </span>
        ) : null}
      </TileLink>
    </li>
  );
}

const MemoTitleWallCard = memo(TitleWallCard);
MemoTitleWallCard.displayName = 'TitleWallCard';

export default MemoTitleWallCard;
