'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useEffectEvent, useState } from 'react';

import useCulmination from '@/lib/marking/useCulmination';

/**
 * How long the finished show stays on the hero, complete, before the next
 * one cross-fades in: long enough to see its line reach the end (the fill
 * slides over 300ms), short enough not to keep the next show waiting.
 */
const FINISH_HOLD_MS = 500;

/**
 * The finished show's last beat: its art dims a little over the line's own
 * 300ms slide (`TrackSlide`)
 */
export const FINISHED_ART = 'brightness-[0.8] transition-[filter] duration-300';

/** The finished season, drawn complete: its line reaches the end */
export const drawnComplete = <
  T extends Readonly<{ seasonTotal: number; seasonWatched: number }>,
>(
  item: T,
): T & Readonly<{ seasonDone: number; toWatch: 0 }> => ({
  ...item,
  seasonDone: item.seasonTotal,
  seasonWatched: item.seasonTotal,
  toWatch: 0,
});

/**
 * An Up next card's show (`shown`: the profile's hero, Home's Continue
 * watching tile). When the viewer's own mark in this tab
 * finishes the show on it (`useCulmination`: never a load, an Undo or a
 * sync), the show stays a beat, `finishing` (drawn complete, its art dimmed),
 * before the next one (or the empty state) takes its place; any other change hands over at once, as
 * does everything with reduced motion (the beat is choreography, not
 * information).
 */
export default function useFinishHold<T extends Readonly<{ seriesId: number }>>(
  current: T | undefined,
): Readonly<{ finishing: boolean; shown: T | undefined }> {
  const [shown, setShown] = useState(current);
  const finished = useCulmination(shown?.seriesId ?? 0, 'show');
  const reduced = useReducedMotion();
  const left = current?.seriesId !== shown?.seriesId;
  const finishing = left && finished !== null && !reduced;
  // the same show (its next episode) or a plain hand-over: follow at once
  // (state adjusted while rendering, React's pattern for it)
  if (!finishing && current !== shown) {
    setShown(current);
  }
  // The beat is timed from the finish alone: the write settling hands the
  // next show back as a new object, which must not restart it
  const release = useEffectEvent(() => setShown(current));
  const held = shown?.seriesId;
  useEffect(() => {
    if (!finishing || held === undefined) {
      return;
    }
    const timer = setTimeout(release, FINISH_HOLD_MS);
    return () => clearTimeout(timer);
  }, [finishing, held]);
  return finishing ? { finishing, shown } : { finishing, shown: current };
}
