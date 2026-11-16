'use client';

import { type ReactNode, useCallback, useRef, useState } from 'react';

import cn from '@/lib/cn';
import useWarmSet from '../toy/useWarmSet';
import CountdownBackdrop from './CountdownBackdrop';
import CountdownPills, { type CountdownPill } from './CountdownPills';
import { COUNTDOWN_FADE, COUNTDOWN_FOOT } from './countdownLayout';

/**
 * One premiere: its backdrop's address and colour (the shade's), its
 * foreground and its pill
 */
export type CountdownSlide = Readonly<{
  backdrop: string;
  body: ReactNode;
  /** The API's `backdropColor` ('#000000' when unknown) */
  color: string;
  key: number;
  pill: CountdownPill;
}>;

/** Only the first backdrop is there from the start */
const FIRST: ReadonlyArray<number> = [0];

/**
 * The pressed pill (`target`), the premiere on show (`shown`: the target
 * once its backdrop is decoded) and the backdrops mounted so far (`warm`).
 */
function useCountdownChoice(count: number) {
  const [target, setTarget] = useState(0);
  const [shown, setShown] = useState(0);
  const [warm, addWarm] = useWarmSet(FIRST);
  const ready = useRef<Set<number>>(new Set(FIRST));
  const latest = useRef(0);

  const choose = useCallback(
    (index: number) => {
      latest.current = index;
      setTarget(index);
      addWarm(index);
      if (ready.current.has(index)) {
        setShown(index);
      }
    },
    [addWarm],
  );

  const loaded = useCallback((index: number) => {
    ready.current.add(index);
    if (latest.current === index) {
      setShown(index);
    }
  }, []);

  const warmAll = useCallback(() => {
    addWarm(...Array.from({ length: count }, (_, index) => index));
  }, [addWarm, count]);

  return { choose, loaded, shown, target, warm, warmAll };
}

/**
 * Which premiere is on show. A pill is pressed at once; the card crossfades
 * to it once its backdrop is decoded (until then the old one stays, so a
 * fade never lands on an empty layer). The incoming backdrop fades in on top
 * while the outgoing one waits under it, then goes, so the card's ground
 * never shows through; the foregrounds crossfade with it. Only the shown
 * layer is opaque, so quick switching settles on the last choice. The other
 * backdrops mount when the pills are first hovered, focused or touched.
 * The foot holds the pills, or `open` with one premiere.
 */
export default function CountdownSwitch({
  open,
  slides,
}: Readonly<{
  /** "Open" for the day's only premiere, in the pills' place */
  open: ReactNode;
  slides: ReadonlyArray<CountdownSlide>;
}>) {
  const { choose, loaded, shown, target, warm, warmAll } = useCountdownChoice(
    slides.length,
  );
  const pills = slides.map((slide) => slide.pill);
  return (
    <>
      {slides.map((slide, index) =>
        warm.has(index) ? (
          <CountdownBackdrop
            backdrop={slide.backdrop}
            color={slide.color}
            index={index}
            key={slide.key}
            on={index === shown}
            onLoaded={loaded}
          />
        ) : null,
      )}
      {slides.map((slide, index) => {
        const on = index === shown;
        const layer = cn(
          'absolute inset-0 z-2',
          COUNTDOWN_FADE,
          on ? 'opacity-100' : 'pointer-events-none opacity-0',
        );
        return (
          <div
            aria-hidden={!on}
            className={layer}
            data-countdown-body={index}
            inert={!on}
            key={slide.key}
          >
            {slide.body}
          </div>
        );
      })}
      <div className={COUNTDOWN_FOOT}>
        {slides.length > 1 ? (
          <CountdownPills
            onChoose={choose}
            onWarm={warmAll}
            pills={pills}
            pressed={target}
          />
        ) : (
          open
        )}
      </div>
    </>
  );
}
