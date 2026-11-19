import { circleButtonStyles } from '@/components/ui/button/buttonStyles';
import {
  ButtonFace,
  FLAT,
  Ghost,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { trendingGlyph, usersGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';
import MetaRow from '@/components/ui/meta/MetaRow';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import { readCount } from '@/lib/profile/counts';
import type { Profile } from '../../_data/profile';
import { orNull } from '../../_lib/orNull';
import EmptyState from '../blocks/EmptyState';
import { LinkGhost } from '../blocks/LaneGhost';

import {
  DECK_BUTTONS,
  DECK_CARD,
  DECK_FACE,
  DECK_FAN,
  DECK_FRAME,
  DECK_PICK,
  DECK_TOP,
} from './start/deckLayout';
import { loadStartDeck, type StartSource } from './start/loadStart';
import { PICK_AGAIN_GLYPH, PICK_AGAIN_LABEL } from './start/pickAgain';
import StartDeck from './start/StartDeck';
import { slotAt } from './start/startCards';
import WatchlistLink from './start/WatchlistLink';

const NOT_NOW = circleButtonStyles({ className: FLAT, size: 44 });

/** Keeps the block's 408px when there is no deck, so nothing below it moves */
const CALM = 'h-[368px] rounded-16 bg-black/22';

/** The pill above a borrowed deck */
const BADGES: Readonly<
  Record<Exclude<StartSource, 'watchlist'>, { glyph: Glyph; text: string }>
> = {
  circle: { glyph: usersGlyph, text: 'Finished by people you follow' },
  trending: { glyph: trendingGlyph, text: 'Popular this week' },
};

function Badge({
  source,
}: Readonly<{ source: Exclude<StartSource, 'watchlist'> }>) {
  const { glyph, text } = BADGES[source];
  return (
    <span className="relative flex h-6 items-center gap-1.5 self-center rounded-full bg-white/6 px-2.5 text-caption font-medium text-white/80">
      <Icon glyph={glyph} size={13} />
      {text}
    </span>
  );
}

/** The block's title: its section, placeholder and streaming hole say it alike */
export const PICK_ONE_TITLE = 'Pick one';

/**
 * Pick one: one show from your watchlist, with the rest fanned
 * behind it, and the way to the whole watchlist in its header (the owner's
 * sidebar has no Watchlist row beside it). Owner only. With fewer than
 * three saved shows the deck is shows your circle finished, else Popular
 * this week (where the middle button saves the show instead of dealing).
 */
export default async function StartSomethingNew({
  profile,
}: Readonly<{ profile: Profile }>) {
  if (profile.viewer !== 'owner') {
    return null;
  }
  const [deck, count] = await Promise.all([
    loadStartDeck(profile),
    orNull(readCount(profile.user.id, 'watchlist')),
  ]);
  const link = <WatchlistLink count={count} username={profile.user.username} />;
  if (deck.cards.length === 0) {
    return (
      <section aria-labelledby="s-start" className="flex flex-col gap-4">
        <SectionHead
          id="s-start"
          link={link}
          size="side"
          title={PICK_ONE_TITLE}
        />
        <EmptyState
          className={CALM}
          glyph={trendingGlyph}
          sub="Nothing to suggest right now."
          title="No picks yet"
        />
      </section>
    );
  }
  const mode = deck.source === 'trending' ? 'add' : 'pick';
  const badge =
    deck.source === 'watchlist' ? null : <Badge source={deck.source} />;
  return (
    <section aria-labelledby="s-start" className="flex flex-col gap-4">
      <SectionHead
        id="s-start"
        link={link}
        size="side"
        title={PICK_ONE_TITLE}
      />
      <StartDeck badge={badge} cards={deck.cards} mode={mode} />
    </section>
  );
}

/** The fan's five cards, back to front */
const FAN = [4, 3, 2, 1, 0].map(slotAt);

const GHOST_DECK = cn(DECK_FRAME, DECK_TOP, PULSE);

/**
 * The block while it streams: the real title and the watchlist link as a
 * bar, the card as a flat panel with
 * the fan's five cards in their places, the face's two lines and the three
 * buttons as flat shapes (the watchlist deck: no source badge).
 */
export function StartSomethingNewSkeleton() {
  const link = <LinkGhost alone width="w-20" />;
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <SectionHead
        id="s-start-sk"
        link={link}
        size="side"
        title={PICK_ONE_TITLE}
      />
      <div className={GHOST_DECK}>
        <div className={DECK_FAN}>
          {FAN.map((slot) => {
            const style = {
              transform: `translate(${slot.x}px, ${slot.y}px) rotate(${slot.rotate}deg)`,
            };
            return <Ghost className={DECK_CARD} key={slot.x} style={style} />;
          })}
        </div>
        <div className={DECK_FACE}>
          <TextLine className="text-body" width="w-28" />
          <MetaRow className="justify-center" fit="drop">
            <TextLine className="text-meta" width="w-40" />
          </MetaRow>
        </div>
        <div className={DECK_BUTTONS}>
          <span className={NOT_NOW} />
          <ButtonFace className={DECK_PICK} icon={PICK_AGAIN_GLYPH} size="lg">
            {PICK_AGAIN_LABEL}
          </ButtonFace>
          <span className={NOT_NOW} />
        </div>
      </div>
    </div>
  );
}
