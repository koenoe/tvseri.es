'use client';

import { useCallback } from 'react';

import Button from '@/components/ui/button/Button';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { bookmarkGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import type { ControlState } from '@/lib/marking/controlState';
import { useShowActions } from '@/lib/marking/showActions';

import {
  BUTTON,
  FACT,
  ICON,
  type MarkLook,
  ON_FILL,
} from './markControlStyles';
import { type LinkState, linkFace, type MarkShow } from './singleFace';

/** A state the one button draws: every state but new to you */
export type SingleState = Exclude<ControlState, { kind: 'new' }>;

type Props = Readonly<{ look: MarkLook; show: MarkShow; state: SingleState }>;

/**
 * The paired control's one button for a series the viewer has: outlined,
 * the pair's full width (the row's), icon and label at its start and a
 * second fact at its end, or centred without one. "On watchlist" (filled
 * bookmark) removes the series from the watchlist; the others open the
 * series page (`linkFace`).
 */
export default function MarkSingle({ look, show, state }: Props) {
  if (state.kind === 'watchlist') {
    return <OnWatchlist look={look} show={show} />;
  }
  return <SeriesLink look={look} show={show} state={state} />;
}

function OnWatchlist({ look, show }: Omit<Props, 'state'>) {
  const actions = useShowActions();
  const { id, title } = show;
  const prepare = useCallback(() => actions.prepare(id), [actions, id]);
  const remove = useCallback(
    () => actions.toggleWatchlist({ id, title }),
    [actions, id, title],
  );
  const classes = cn(BUTTON[look], 'w-full', ON_FILL);
  const name = `Remove ${title} from your watchlist`;
  return (
    <Button
      aria-label={name}
      className={classes}
      icon={bookmarkGlyph}
      iconSize={ICON[look]}
      onClick={remove}
      onFocus={prepare}
      onPointerEnter={prepare}
      pressed
      variant="outline"
    >
      On watchlist
    </Button>
  );
}

function SeriesLink({
  look,
  show,
  state,
}: Omit<Props, 'state'> & Readonly<{ state: LinkState }>) {
  const face = linkFace(state, show);
  const classes = cn(BUTTON[look], 'w-full');
  return (
    <ButtonLink
      className={classes}
      href={face.href}
      icon={face.glyph}
      iconSize={ICON[look]}
      variant="outline"
    >
      {face.fact ? (
        <>
          <span className="min-w-0 flex-1 truncate text-left">
            {face.label}
          </span>
          <span className={FACT}>{face.fact}</span>
        </>
      ) : (
        face.label
      )}
    </ButtonLink>
  );
}
