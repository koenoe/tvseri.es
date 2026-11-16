'use client';

import { Suspense, use } from 'react';

import { PULSE } from '@/components/ui/ghost/ghosts';
import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';
import cn from '@/lib/cn';
import { type ControlStatesRead, NEW_TO_YOU } from '@/lib/marking/controlState';

import { ROW } from './markControlStyles';
import WatchlistToggleGhost from './WatchlistToggleGhost';
import WatchlistToggleRow, { type ToggleProps } from './WatchlistToggleRow';

type Props = ToggleProps &
  Readonly<{
    /**
     * The page's one read (`loadSeriesStates`) where the series may already
     * be on the viewer's watchlist; none where it never is (Versus, Connected
     * by) or the block asks for nothing (Binge)
     */
    states?: ControlStatesRead;
  }>;

const signedOutOnly = { [SIGNED_OUT_ONLY]: '' };
const signedInOnly = { [SIGNED_IN_ONLY]: '' };

/**
 * The watchlist-only control: Premieres' tickets,
 * Pick one for me, Connected by, Versus and Binge. With the page's read it
 * streams in its own Suspense boundary: a ghost of its box for a signed-in
 * viewer until the state lands, "+ Watchlist" for everyone else. A state
 * already in the browser (a block drawn after a roll) draws at once.
 */
export default function WatchlistToggle({ states, ...props }: Props) {
  if (!states) {
    return <WatchlistToggleRow {...props} />;
  }
  const fallback = <WatchlistToggleFallback {...props} />;
  return (
    <Suspense fallback={fallback}>
      <StreamedToggle {...props} states={states} />
    </Suspense>
  );
}

function StreamedToggle({
  states,
  ...props
}: ToggleProps & Readonly<{ states: ControlStatesRead }>) {
  const resolved = use(states);
  const streamed = resolved?.[props.id] ?? NEW_TO_YOU;
  return (
    <WatchlistToggleRow
      {...props}
      fadeIn={resolved !== null}
      streamed={streamed}
    />
  );
}

function WatchlistToggleFallback(props: ToggleProps) {
  const { className, label = 'Watchlist', size = 'sm', ...rest } = props;
  // the outer row takes the place's classes
  const inner = { ...rest, label, size };
  const row = cn(ROW, className);
  return (
    <span className={row} data-watchlist-toggle="loading">
      <span {...signedOutOnly} className="flex">
        <WatchlistToggleRow {...inner} streamed={NEW_TO_YOU} />
      </span>
      <span {...signedInOnly} className="hidden">
        <WatchlistToggleGhost className={PULSE} label={label} size={size} />
      </span>
    </span>
  );
}
