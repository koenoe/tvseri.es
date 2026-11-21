'use client';

import Link from 'next/link';
import WatchlistToggle from '@/components/marking/WatchlistToggle';
import CrossFade from '@/components/motion/CrossFade';
import Button from '@/components/ui/button/Button';
import { ROLL_GLYPH, ROLL_LABEL } from '@/components/ui/button/roll';
import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
  trendingGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import showPath from '@/lib/routing/showPath';
import {
  RESULT,
  RESULT_ACTIONS,
  RESULT_TEXT,
  RESULT_TITLE,
  RESULT_WHY,
} from './layout';
import type { PickCardItem } from './PickDeck';

type Props = Readonly<{
  card: PickCardItem;
  /** none when only one card was dealt: nothing to roll to */
  onRoll?: () => void;
  /** a roll is under way: Roll again shows it can't take another yet */
  rolling: boolean;
  /**
   * The viewer's states (the page's one read, the deck included): a roll
   * lands after it, so the result draws its Watchlist at once
   */
  states?: ControlStatesRead;
}>;

/**
 * The pick's title (it opens the show), its meta line,
 * the why line (desktop; the phone drops it), then + Watchlist and
 * Roll again (when there is another card). Announced politely when a roll
 * lands, the text fading to the new pick (`CrossFade`; the actions
 * stay).
 * Roll again reads as disabled for the roll's length: the roll can't take
 * another press (`usePickRoll`), and the button says so rather than drop it
 * silently.
 */
export default function PickResult({ card, onRoll, rolling, states }: Props) {
  const href = showPath(card.id, card.slug);
  const openLabel = `Open ${card.title}`;
  const settling = rolling || undefined;
  return (
    <div aria-live="polite" className={RESULT}>
      <CrossFade className={RESULT_TEXT} swapKey={card.id}>
        <h3 className={RESULT_TITLE}>
          <Link
            aria-label={openLabel}
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
      </CrossFade>
      <div className={RESULT_ACTIONS}>
        <WatchlistToggle id={card.id} states={states} title={card.title} />
        {onRoll ? (
          <Button
            aria-disabled={settling}
            icon={ROLL_GLYPH}
            onClick={onRoll}
            size="sm"
            variant="outline"
          >
            {ROLL_LABEL}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
