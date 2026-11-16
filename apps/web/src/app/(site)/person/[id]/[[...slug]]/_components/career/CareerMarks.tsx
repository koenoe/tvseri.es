'use client';

import type { PersonCareerWeight } from '@tvseri.es/schemas';
import type { CSSProperties } from 'react';
import { checkGlyph, eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import {
  type Bar,
  besideBar,
  type CaptionPlace,
  TRACK,
  watchedWidth,
} from '../../_lib/career';
import { useCreditWatched, useHasWatched } from '../watched/store';
import { barStyle, WEIGHT } from './bars';
import styles from './career.module.css';

const place = (at: CaptionPlace, gap: number) => {
  if (at.side === 'over') {
    return { left: 'auto', over: true, right: '0px' };
  }
  return at.side === 'after'
    ? { left: `calc(${at.left}% + ${gap}px)`, over: false, right: 'auto' }
    : { left: 'auto', over: false, right: `calc(${at.right}% + ${gap}px)` };
};

/** On the bar: the caption's ground, so the count reads over the fill */
const OVER = {
  desktop: 'lg:rounded-6 lg:bg-[#161b1c] lg:px-2',
  phone: 'max-lg:rounded-6 max-lg:bg-[#161b1c] max-lg:px-1.5',
};

/** Desktop stops short of the Today label; phones keep 10px clear */
const LIMIT = { desktop: TRACK.desktop - 24, phone: TRACK.phone - 10 };

/**
 * One series' bar and the viewer's count ("Watched"). Signed out
 * (or until the marks arrive) one soft fill; signed in, the watched stretch
 * solid white and the rest an outlined track, with "62 of 62 watched" (✓)
 * or "10 of 20 watched" (eye) beside the bar.
 */
export default function CareerMarks({
  bar,
  personId,
  runs,
  seriesId,
  weight,
}: Readonly<{
  bar: Bar;
  personId: number;
  /** The stretches it aired; the watched share fills them in order */
  runs: ReadonlyArray<Bar>;
  seriesId: number;
  weight: PersonCareerWeight;
}>) {
  const signedIn = useHasWatched(personId);
  const watched = useCreditWatched(personId, seriesId);
  const base = cn('absolute', WEIGHT[weight]);

  if (!signedIn) {
    return runs.map((run) => (
      <i
        className={cn(base, 'bg-white/26')}
        key={run.start}
        style={barStyle(run.start, run.end)}
      />
    ));
  }

  const fraction = watched?.fraction ?? 0;
  const outline = 'shadow-[inset_0_0_0_1px_rgb(255_255_255/0.42)]';
  // The watched share of the whole length, filled run by run
  const total = runs.reduce((sum, run) => sum + run.end - run.start, 0);
  let left = total * fraction;
  const pieces = runs.flatMap((run) => {
    const lit = Math.max(0, Math.min(run.end - run.start, left));
    left -= lit;
    const split = run.start + lit;
    return [
      ...(lit > 0 ? [{ end: split, lit: true, start: run.start }] : []),
      ...(split < run.end ? [{ end: run.end, lit: false, start: split }] : []),
    ];
  });
  const desktop = watched
    ? place(
        besideBar(
          bar,
          watchedWidth(watched.count, 'desktop'),
          TRACK.desktop,
          LIMIT.desktop,
        ),
        8,
      )
    : null;
  const phone = watched
    ? place(
        besideBar(
          bar,
          watchedWidth(watched.count, 'phone'),
          TRACK.phone,
          LIMIT.phone,
          6,
        ),
        6,
      )
    : null;
  const labelStyle =
    desktop && phone
      ? ({
          '--wl': desktop.left,
          '--wlm': phone.left,
          '--wr': desktop.right,
          '--wrm': phone.right,
        } as CSSProperties)
      : undefined;

  return (
    <>
      {pieces.map((piece) => (
        <i
          className={cn(base, piece.lit ? 'bg-white/92' : outline)}
          key={`${piece.start}-${piece.lit}`}
          style={barStyle(piece.start, piece.end)}
        />
      ))}
      {watched ? (
        <span
          className={cn(
            styles.wn,
            desktop?.over ? OVER.desktop : null,
            phone?.over ? OVER.phone : null,
            'absolute top-3 right-(--wrm) left-(--wlm) flex h-5 items-center gap-1 text-caption whitespace-nowrap text-white/80 tabular-nums lg:top-1.5 lg:right-(--wr) lg:left-(--wl) lg:gap-[5px]',
          )}
          style={labelStyle}
        >
          <Icon
            className="shrink-0 max-lg:size-[11px]"
            glyph={watched.complete ? checkGlyph : eyeGlyph}
            size={12}
          />
          <span className="sr-only">, </span>
          {watched.count}
        </span>
      ) : null}
    </>
  );
}
