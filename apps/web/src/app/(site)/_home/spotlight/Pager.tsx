'use client';

import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
  useImperativeHandle,
  useRef,
} from 'react';

import { pauseGlyph, playGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import IconSwap from '@/components/ui/icon/IconSwap';
import cn from '@/lib/cn';

import styles from './spotlight.module.css';
import usePagerSweep from './usePagerSweep';

/** What a swipe asks of the pager: sweep its lines to the slide it moves to, as a press would */
export type PagerHandle = Readonly<{ sweepTo: (index: number) => void }>;

type Props = Readonly<{
  countdownKey: string;
  current: number;
  hydrated: boolean;
  onCountdownEnd: () => void;
  onCountdownStart: () => void;
  /** a line is hovered or focused: decode its backdrop, so a press switches at once */
  onIntent: (index: number) => void;
  onSelect: (index: number) => void;
  onTogglePlay: () => void;
  /** a swipe's way in to the sweep (`PagerHandle`) */
  ref?: Ref<PagerHandle>;
  /** the pressed slide's backdrop is still decoding: its line holds still */
  pending: boolean;
  running: boolean;
  titles: ReadonlyArray<string>;
  /** the reader pressed pause or play; before that the glyph follows reduced motion in CSS */
  userChose: boolean;
  userPaused: boolean;
}>;

/**
 * The spotlight's ten countdown lines and the quiet pause/play. Desktop: 28px lines 8px apart, 18px
 * before the 32px pause button, each a 40px target, bottom right on the buttons' line. Phone:
 * under the spotlight at the content's width (the cards' edges below), the
 * lines sharing it 6px apart, each in a 44px-tall target that reaches its
 * neighbours, so a tap lands on the nearest line; pause ends the row. The current
 * line fills over 8s (longer than the usual 5 to 7s for a hero slide: each
 * carries a title and a few facts); earlier lines are full, later ones
 * empty. A press or a swipe sweeps the lines between the old slide and the
 * new one (`usePagerSweep`); the pressed line's countdown starts once its slide
 * shows. The markup is the same for every viewer (the pause button always
 * there).
 * Until the reader presses it, the button draws play for a reader who asked
 * for reduced motion (the slideshow starts paused for them) and pause for
 * everyone else, from CSS, so the first paint is already right.
 */
export default function Pager({
  countdownKey,
  current,
  hydrated,
  onCountdownEnd,
  onCountdownStart,
  onIntent,
  onSelect,
  onTogglePlay,
  pending,
  ref,
  running,
  titles,
  userChose,
  userPaused,
}: Props) {
  const count = titles.length;
  const playState = running ? 'running' : 'paused';
  const countdownStyle = { animationPlayState: playState };
  const toggleLabel = userPaused ? 'Play the slideshow' : 'Pause the slideshow';
  const counting = hydrated && !pending;
  const lines = useRef<HTMLDivElement>(null);
  const press = usePagerSweep(lines, current);
  useImperativeHandle(ref, () => ({ sweepTo: press }), [press]);
  const countdownClasses = cn(
    'absolute inset-0 block rounded-2 bg-white',
    styles.countdown,
  );
  const select = (event: MouseEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.index);
    press(index);
    onSelect(index);
  };
  const intent = (
    event: FocusEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>,
  ) => onIntent(Number(event.currentTarget.dataset.index));

  return (
    <div className="pointer-events-auto absolute inset-x-gutter top-[calc(100%+10px)] flex h-[13px] items-center justify-center gap-[13px] md:inset-x-auto md:top-auto md:right-8 md:bottom-[30px] md:h-7 md:gap-[18px]">
      {/* polite only while it holds still: a rotating slideshow stays quiet */}
      <span aria-live={running ? 'off' : 'polite'} className="sr-only">
        Series {String(current + 1).padStart(2, '0')} of {count}
      </span>
      {/* the play/pause control comes first in the tab order (APG carousel),
          drawn last. On a phone its 44px target reaches the last line's
          (10px: the gap less the lines' -3px) and takes the rest from the
          gutter, so the two targets never overlap. On desktop it reaches 4px
          all round (40px), 10px short of the last line's */}
      <button
        aria-label={toggleLabel}
        // contrast-exempt: the pause icon on phones
        className="relative order-last inline-flex size-[13px] cursor-pointer items-center justify-center rounded-full text-white/55 after:absolute after:-inset-y-[15.5px] after:-right-[21px] after:-left-2.5 after:content-[''] md:size-8 md:text-white/60 md:after:-inset-1 md:hover:bg-white/8 md:hover:text-white"
        onClick={onTogglePlay}
        type="button"
      >
        <ToggleIcon chosen={userChose} paused={userPaused} />
      </button>
      <div
        aria-label="Trending series"
        className="flex items-center max-md:-mx-[3px] max-md:min-w-0 max-md:flex-1 md:gap-2"
        ref={lines}
        role="group"
      >
        {titles.map((title, index) => {
          const isCurrent = index === current;
          const label = `${index + 1} of ${count}: ${title}`;
          // a scale, so a press can sweep it (`usePagerSweep`)
          const fill = cn(
            'absolute inset-0 block origin-left rounded-2 bg-white',
            index >= current && '[transform:scaleX(0)]',
          );
          return (
            <button
              aria-current={isCurrent ? 'true' : undefined}
              aria-label={label}
              className={LINE}
              data-index={index}
              key={index}
              onClick={select}
              onFocus={intent}
              onPointerEnter={intent}
              type="button"
            >
              <span className="relative block h-0.5 w-[calc(100%-6px)] overflow-hidden rounded-2 bg-white/40 group-hover:bg-white/60 md:w-full">
                {isCurrent && counting ? (
                  <i
                    className={countdownClasses}
                    key={countdownKey}
                    onAnimationEnd={onCountdownEnd}
                    onAnimationStart={onCountdownStart}
                    style={countdownStyle}
                  />
                ) : (
                  <i className={fill} data-line-fill="" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A line's target: 44px tall on a phone. On desktop the 28px button reaches
 * 4px either side (half the 8px gap, so neighbours meet without overlapping)
 * and 6px up and down: 36 × 40.
 */
const LINE =
  "group relative flex h-11 min-w-0 cursor-pointer items-center justify-center rounded-4 max-md:flex-1 md:h-7 md:w-7 md:after:absolute md:after:-inset-x-1 md:after:-inset-y-1.5 md:after:content-['']";

const ICON_CLASS = 'size-[13px] md:size-4';
const PAUSE_UNLESS_REDUCED = cn(ICON_CLASS, 'motion-reduce:hidden');
const PLAY_IF_REDUCED = cn(ICON_CLASS, 'motion-safe:hidden');

/** Play while paused, else pause; before a press, as reduced motion has it */
function ToggleIcon({
  chosen,
  paused,
}: Readonly<{ chosen: boolean; paused: boolean }>) {
  if (chosen) {
    const glyph = paused ? playGlyph : pauseGlyph;
    return <IconSwap className={ICON_CLASS} glyph={glyph} size={16} />;
  }
  return (
    <>
      <Icon className={PAUSE_UNLESS_REDUCED} glyph={pauseGlyph} size={16} />
      <Icon className={PLAY_IF_REDUCED} glyph={playGlyph} size={16} />
    </>
  );
}
