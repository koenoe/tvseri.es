'use client';

import { Suspense, use } from 'react';

import { type ControlStatesRead, NEW_TO_YOU } from '@/lib/marking/controlState';

import MarkControlFallback from './MarkControlFallback';
import MarkControlRow from './MarkControlRow';
import type { MarkLook } from './markControlStyles';
import type { MarkShow } from './singleFace';

type Props = Readonly<{
  look: MarkLook;
  show: MarkShow;
  /**
   * The page's one read of the viewer's states (`loadSeriesStates`); none:
   * the pair, as signed out (a preview)
   */
  states?: ControlStatesRead | null;
}>;

/**
 * The Watchlist + Seen it control: new to you, the pair;
 * on the watchlist, watching, up to date or finished, one outlined button
 * exactly the pair's width. The state streams from the server in its own
 * Suspense boundary; until it lands a signed-in viewer sees two ghost pills
 * at the pair's widths and everyone else the pair, decided before the
 * first paint (the pre-paint script's signed-in rule), so the cached shell
 * is the same for all and nothing moves.
 */
export default function MarkControl({ look, show, states }: Props) {
  if (!states) {
    return (
      <MarkControlRow
        fadeIn={false}
        look={look}
        show={show}
        streamed={NEW_TO_YOU}
      />
    );
  }
  const fallback = <MarkControlFallback look={look} show={show} />;
  return (
    <Suspense fallback={fallback}>
      <StreamedMarkControl look={look} show={show} states={states} />
    </Suspense>
  );
}

function StreamedMarkControl({
  look,
  show,
  states,
}: Readonly<{ look: MarkLook; show: MarkShow; states: ControlStatesRead }>) {
  const resolved = use(states);
  const streamed = resolved?.[show.id] ?? NEW_TO_YOU;
  return (
    <MarkControlRow
      fadeIn={resolved !== null}
      look={look}
      show={show}
      streamed={streamed}
    />
  );
}
