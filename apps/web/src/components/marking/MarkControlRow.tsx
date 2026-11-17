'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { LATE_FADE } from '@/components/motion/lateFade';
import cn from '@/lib/cn';
import type { ControlState } from '@/lib/marking/controlState';
import useControlState from '@/lib/marking/useControlState';

import MarkPair from './MarkPair';
import MarkSingle, { type SingleState } from './MarkSingle';
import { layer, type MarkLook, ROW } from './markControlStyles';
import type { MarkShow } from './singleFace';

type Props = Readonly<{
  look: MarkLook;
  show: MarkShow;
  /** the state the server streamed (the pair signed out) */
  streamed: ControlState;
  /** streamed in over the ghost: the row fades in (signed out it is the shell's pair, as it was) */
  fadeIn: boolean;
}>;

const FOCUSABLE = 'a, button';

type Drawn = Readonly<{ id: number; state: SingleState }>;

/**
 * The paired control's reserved row: the pair and the one button in the
 * same grid cell. The pair is always laid out (it sizes the row), shown
 * while the series is new to you; any other state shows the one button over
 * it at the row's full width. A change crossfades the two in place (150ms,
 * opacity only); the last one button stays drawn while it fades out. Focus
 * follows a press to the layer that takes its place. Streamed in over the
 * ghost, the row fades in (`LATE_FADE`, on insertion only).
 */
export default function MarkControlRow({
  fadeIn,
  look,
  show,
  streamed,
}: Props) {
  const state = useControlState(show.id, streamed);
  const single = state.kind === 'new' ? null : state;
  // the last one button stays drawn while it fades out (this series' only)
  const [last, setLast] = useState<Drawn | null>(
    single ? { id: show.id, state: single } : null,
  );
  if (single && (last?.state !== single || last.id !== show.id)) {
    setLast({ id: show.id, state: single });
  }
  const drawn = last?.id === show.id ? last.state : null;
  const pairShown = single === null;
  const row = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const focused = document.activeElement;
    const leaving = row.current?.querySelector(
      `[data-layer="${pairShown ? 'single' : 'pair'}"]`,
    );
    if (focused && leaving?.contains(focused)) {
      row.current
        ?.querySelector<HTMLElement>(
          `[data-layer="${pairShown ? 'pair' : 'single'}"] :is(${FOCUSABLE})`,
        )
        ?.focus();
    }
  }, [pairShown]);
  const classes = cn(ROW, fadeIn && LATE_FADE);
  const pairLayer = layer(pairShown);
  const singleLayer = cn('flex', layer(!pairShown));
  const pairHidden = !pairShown || undefined;
  const singleHidden = pairShown || undefined;
  return (
    <span className={classes} data-mark-control={state.kind} ref={row}>
      {/* keyed by the series: another series (the decade card's next
          tile) swaps at once, a press on this one crossfades */}
      <span
        aria-hidden={pairHidden}
        className={pairLayer}
        data-layer="pair"
        key={`pair-${show.id}`}
      >
        <MarkPair look={look} show={show} />
      </span>
      {drawn ? (
        <span
          aria-hidden={singleHidden}
          className={singleLayer}
          data-layer="single"
          key={`single-${show.id}`}
        >
          <MarkSingle look={look} show={show} state={drawn} />
        </span>
      ) : null}
    </span>
  );
}
