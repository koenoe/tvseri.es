'use client';

import Link from 'next/link';
import WatchlistToggle from '@/components/marking/WatchlistToggle';
import Button from '@/components/ui/button/Button';
import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
  trendingGlyph,
  variantDiceGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import showPath from '@/lib/routing/showPath';
import {
  RESULT,
  RESULT_ACTIONS,
  RESULT_TITLE,
  RESULT_WHY,
  ROLL_LABEL,
} from './layout';
import type { PickCardItem } from './PickDeck';

type Props = Readonly<{
  card: PickCardItem;
  onRoll: () => void;
  /**
   * The viewer's states (the page's one read, the deck included): a roll
   * lands after it, so the result draws its Watchlist at once
   */
  states?: ControlStatesRead;
}>;

/**
 * The pick's title (it opens the show), its meta line,
 * the why line (desktop; the phone drops it), then + Watchlist and
 * Roll again. Announced politely when a roll lands.
 */
export default function PickResult({ card, onRoll, states }: Props) {
  const href = showPath(card.id, card.slug);
  return (
    <div aria-live="polite" className={RESULT}>
      <h3 className={RESULT_TITLE}>
        <Link
          aria-label={`Open ${card.title}`}
          className="decoration-2 underline-offset-[5px] hover:underline"
          href={href}
        >
          {card.title}
        </Link>
      </h3>
      <MetaRow>
        <MetaItem icon={calendarGlyph}>{card.year}</MetaItem>
        <MetaItem icon={seasonGlyph}>{card.seasons}</MetaItem>
        <MetaItem icon={tagGlyph} shrink>
          {card.genre}
        </MetaItem>
      </MetaRow>
      <MetaRow className={RESULT_WHY}>
        <MetaItem icon={trendingGlyph} shrink>
          {card.why}
        </MetaItem>
      </MetaRow>
      <div className={RESULT_ACTIONS}>
        <WatchlistToggle id={card.id} states={states} title={card.title} />
        <Button
          icon={variantDiceGlyph}
          onClick={onRoll}
          size="sm"
          variant="outline"
        >
          {ROLL_LABEL}
        </Button>
      </div>
    </div>
  );
}
