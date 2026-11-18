'use client';

import { useState, useSyncExternalStore } from 'react';

import { LATE_FADE } from '@/components/motion/lateFade';
import Button from '@/components/ui/button/Button';
import type { ButtonSize } from '@/components/ui/button/buttonStyles';
import { bookmarkGlyph, plusGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import {
  type ControlState,
  isOnWatchlist,
  NEW_TO_YOU,
} from '@/lib/marking/controlState';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import { useShowActions } from '@/lib/marking/showActions';
import useControlState from '@/lib/marking/useControlState';

import { ON_FILL, ROW } from './markControlStyles';
import ToggleSizers, { ON_LABEL } from './ToggleSizers';

export type ToggleProps = Readonly<{
  className?: string;
  id: number;
  /** the add state's label ("Watchlist"; Binge's "Add to watchlist") */
  label?: string;
  size?: ButtonSize;
  title: string;
}>;

/** The server and hydration never know the tab's seeds (the HTML matches) */
const notYet = () => false;

type Props = ToggleProps &
  Readonly<{
    fadeIn?: boolean;
    /** the server's state; none: no read, "+ Watchlist" until a press here */
    streamed?: ControlState;
  }>;

/**
 * The watchlist-only toggle in its fixed box: outlined, two states, "+
 * Watchlist" and "On watchlist" (filled bookmark, a faint fill). The box is
 * the wider of the two (`ToggleSizers`), so a press changes the label in
 * place. A press adds or removes, with the toast and Undo; signed out it
 * asks to sign in. With a streamed state it follows the tab's store (a
 * press, its Undo, a mark elsewhere); without one it draws "+ Watchlist"
 * until the tab knows the series (a press seeds it).
 */
export default function WatchlistToggleRow({
  className,
  fadeIn = false,
  id,
  label = 'Watchlist',
  size = 'sm',
  streamed,
  title,
}: Props) {
  const actions = useShowActions();
  const live = useControlState(id, streamed ?? NEW_TO_YOU);
  // without a read, the series is known once the tab seeds it (a press on
  // it or its twin, a hover's warm-up) or once pressed here
  const store = useMarkingStoreApi();
  const seeded = useSyncExternalStore(
    store.subscribe,
    () => store.getState().series[id] !== undefined,
    notYet,
  );
  const [pressed, setPressed] = useState(false);
  const on = streamed || seeded || pressed ? isOnWatchlist(live) : false;
  const prepare = () => actions.prepare(id);
  const toggle = () => {
    setPressed(true);
    actions.toggleWatchlist({ id, title });
  };
  const row = cn(ROW, fadeIn && LATE_FADE, className);
  const button = cn('w-full', on && ON_FILL);
  const name = on
    ? `Remove ${title} from your watchlist`
    : `Add ${title} to your watchlist`;
  const icon = on ? bookmarkGlyph : plusGlyph;
  const text = on ? ON_LABEL : label;
  const toggleState = on ? 'on' : 'off';
  return (
    <span className={row} data-watchlist-toggle={toggleState}>
      <ToggleSizers label={label} size={size} />
      <Button
        aria-label={name}
        className={button}
        icon={icon}
        onClick={toggle}
        onFocus={prepare}
        onPointerEnter={prepare}
        pressed={on}
        size={size}
        variant="outline"
      >
        {text}
      </Button>
    </span>
  );
}
