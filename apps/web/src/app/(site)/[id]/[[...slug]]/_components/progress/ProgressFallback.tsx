'use client';

import { useSyncExternalStore } from 'react';

import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import type { SeriesEntry } from '@/lib/marking/store';

import ProgressBar, { ProgressSkeleton } from './ProgressBar';
import { rememberedLine } from './rememberedLine';

/**
 * The viewer's own marks for the show, as the server read them: a seed
 * with its read time (`fetchedAt`, signed in) that didn't fail. Never a
 * signed-out (seasons only) or unavailable seed.
 */
const hasViewerMarks = (entry: SeriesEntry | undefined) =>
  entry !== undefined && entry.version > 0 && entry.view.unavailable !== true;

/** The server and hydration never know the tab's store: the skeleton */
const onServer = () => false;

/**
 * The progress hole's fallback. A show this tab already drew the line for
 * (`rememberedLine`), whose marks the store still holds from the viewer's
 * own read, gets the real line at once, the same box and words the hole
 * then confirms; anything else gets the skeleton. Never a guess: no marks
 * from the viewer's read, or no line drawn here before (a hover's seed
 * alone), and it's the skeleton. The server (the static shell) and
 * hydration always draw the skeleton.
 */
export default function ProgressFallback({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  const store = useMarkingStoreApi();
  const known = useSyncExternalStore(
    store.subscribe,
    () => hasViewerMarks(store.getState().series[seriesId]),
    onServer,
  );
  const inputs = known ? rememberedLine(seriesId) : undefined;
  if (!inputs) {
    return <ProgressSkeleton />;
  }
  return (
    <ProgressBar
      nextAirDate={inputs.nextAirDate}
      runtimes={inputs.runtimes}
      seriesId={seriesId}
      signedIn
    />
  );
}
