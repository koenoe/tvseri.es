'use client';

import * as m from 'motion/react-m';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import Button from '@/components/ui/button/Button';
import { circleButtonStyles } from '@/components/ui/button/buttonStyles';
import CircleButton from '@/components/ui/button/CircleButton';
import {
  arrowRightGlyph,
  calendarGlyph,
  closeGlyph,
  seasonGlyph,
  shuffleGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import NetworkWordmark from '@/components/ui/network/NetworkWordmark';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import showPath from '@/lib/routing/showPath';

import AddCurrent from './AddCurrent';
import DeckFan from './DeckFan';
import {
  DECK_BUTTONS,
  DECK_FACE,
  DECK_FRAME,
  DECK_PICK,
  DECK_TOP,
  DECK_TOP_WITH_BADGE,
} from './deckLayout';
import { dealRandom, type StartCard, sendToBack } from './startCards';

/** The top card's link: over its slot, above every card (the top is z 5) */
const POSTER_LINK = 'absolute inset-0 z-6 rounded-14';

/** The title links to the show, as the poster above it does */
const TITLE_LINK =
  'min-w-0 truncate rounded-4 underline-offset-4 hover:underline';

/** The card on top: its provider and title, then what there is to know */
function Face({
  card,
  dealt,
  href,
}: Readonly<{ card: StartCard; dealt: boolean; href: string }>) {
  const initial = dealt ? { opacity: 0, y: 6 } : false;
  return (
    <m.div
      animate={{ opacity: 1, y: 0 }}
      className={DECK_FACE}
      initial={initial}
      transition={{ duration: 0.25 }}
    >
      {/* one line, so dealing another card never changes the card's height */}
      <span className="flex max-w-full items-baseline gap-2.5 text-body font-semibold">
        {card.provider ? (
          // the network's wordmark is wide: drawn white a little taller than
          // the title's capitals and standing on its baseline (as on
          // Discover's lens tiles), never squeezed into a square
          <NetworkWordmark
            alt={card.provider.name}
            className="h-[1.3cap] w-auto max-w-16 shrink-0"
            height={32}
            sizes="64px"
            src={card.provider.logo}
            width={128}
          />
        ) : null}
        <TileLink className={TITLE_LINK} href={href} title={card.title}>
          {card.title}
        </TileLink>
      </span>
      <MetaRow className="max-w-full justify-center" fit="drop">
        <MetaItem icon={seasonGlyph}>{card.seasons}</MetaItem>
        <MetaItem icon={calendarGlyph}>{card.status}</MetaItem>
      </MetaRow>
    </m.div>
  );
}

/**
 * Start something new's card: the deck, the show on top and three buttons.
 * The top card's poster and title link to the show (the cards behind are
 * pictures only). ✕ Not now sends the top card to the back, Pick one deals
 * a random one, → opens the show. On the Popular this week deck (`add`)
 * the middle button saves the show on top instead.
 */
export default function StartDeck({
  badge,
  cards,
  mode,
}: Readonly<{
  badge: ReactNode;
  cards: ReadonlyArray<StartCard>;
  mode: 'add' | 'pick';
}>) {
  const [order, setOrder] = useState<ReadonlyArray<number>>(() =>
    cards.map((card) => card.id),
  );
  const [dealt, setDealt] = useState(false);
  const top = cards.find((card) => card.id === order[0]);
  if (!top) {
    return null;
  }
  const alone = cards.length < 2;
  const notNow = () => {
    setDealt(true);
    setOrder(sendToBack);
  };
  const pickOne = () => {
    setDealt(true);
    setOrder((current) => dealRandom(current, Math.random));
  };
  const frame = cn(DECK_FRAME, badge ? DECK_TOP_WITH_BADGE : DECK_TOP);
  const href = showPath(top.id, top.slug);
  const openClass = circleButtonStyles({ size: 44 });
  const open = `Open ${top.title}`;
  return (
    <div className={frame}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_38%,rgb(255_0_128/0.1),transparent_70%)]"
      />
      {badge}
      <DeckFan cards={cards} dealt={dealt} order={order}>
        <TileLink aria-label={top.title} className={POSTER_LINK} href={href} />
      </DeckFan>
      <Face card={top} dealt={dealt} href={href} key={top.id} />
      <div className={DECK_BUTTONS}>
        <CircleButton
          disabled={alone}
          icon={closeGlyph}
          label="Not now"
          onClick={notNow}
          size={44}
        />
        {mode === 'add' ? (
          <AddCurrent id={top.id} key={top.id} />
        ) : (
          <Button
            className={DECK_PICK}
            disabled={alone}
            icon={shuffleGlyph}
            iconSize={16}
            onClick={pickOne}
            size="lg"
            variant="primary"
          >
            Pick one
          </Button>
        )}
        <Link aria-label={open} className={openClass} href={href} title={open}>
          <Icon glyph={arrowRightGlyph} size={16} />
        </Link>
      </div>
    </div>
  );
}
