'use client';

import type { FocusEvent, MouseEvent, PointerEvent } from 'react';

import { pauseGlyph, playGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import styles from './spotlight.module.css';

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
  running: boolean;
  titles: ReadonlyArray<string>;
  /** the reader pressed pause or play; before that the glyph follows reduced motion in CSS */
  userChose: boolean;
  userPaused: boolean;
}>;

/**
 * The spotlight's ten countdown lines and the quiet pause/play. Desktop: 28px lines 8px apart, 18px
 * before the 32px pause button, bottom right on the buttons' line. Phone:
 * under the spotlight at the content's width (the cards' edges below), the
 * lines sharing it 6px apart, each in a 44px-tall target that reaches its
 * neighbours, so a tap lands on the nearest line; pause ends the row. The current
 * line fills over 8s (longer than the usual 5 to 7s for a hero slide: each
 * carries a title and a few facts); earlier lines are full, later ones
 * empty. The markup is the same for every viewer (the pause button always
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
  running,
  titles,
  userChose,
  userPaused,
}: Props) {
  const count = titles.length;
  const playState = running ? 'running' : 'paused';
  const countdownStyle = { animationPlayState: playState };
  const toggleLabel = userPaused ? 'Play the slideshow' : 'Pause the slideshow';
  const animated = hydrated;
  const countdownClasses = cn(
    'absolute inset-0 block rounded-2 bg-white',
    styles.countdown,
  );
  const select = (event: MouseEvent<HTMLButtonElement>) =>
    onSelect(Number(event.currentTarget.dataset.index));
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
          gutter, so the two targets never overlap */}
      <button
        aria-label={toggleLabel}
        // contrast-exempt: the pause icon on phones
        className="relative order-last inline-flex size-[13px] cursor-pointer items-center justify-center rounded-full text-white/55 after:absolute after:-inset-y-[15.5px] after:-right-[21px] after:-left-2.5 after:content-[''] md:size-8 md:text-white/60 md:after:hidden md:hover:bg-white/8 md:hover:text-white"
        onClick={onTogglePlay}
        type="button"
      >
        <ToggleIcon chosen={userChose} paused={userPaused} />
      </button>
      <div
        aria-label="Trending series"
        className="flex items-center max-md:-mx-[3px] max-md:min-w-0 max-md:flex-1 md:gap-2"
        role="group"
      >
        {titles.map((title, index) => {
          const isCurrent = index === current;
          const label = `${index + 1} of ${count}: ${title}`;
          const fill = cn(
            'absolute inset-y-0 left-0 block rounded-2 bg-white',
            index < current && 'w-full',
            isCurrent && 'w-0',
          );
          return (
            <button
              aria-current={isCurrent ? 'true' : undefined}
              aria-label={label}
              className="group flex h-11 min-w-0 cursor-pointer items-center justify-center rounded-4 max-md:flex-1 md:h-7 md:w-7"
              data-index={index}
              key={index}
              onClick={select}
              onFocus={intent}
              onPointerEnter={intent}
              type="button"
            >
              <span className="relative block h-0.5 w-[calc(100%-6px)] overflow-hidden rounded-2 bg-white/40 group-hover:bg-white/60 md:w-full">
                {isCurrent && animated ? (
                  <i
                    className={countdownClasses}
                    key={countdownKey}
                    onAnimationEnd={onCountdownEnd}
                    onAnimationStart={onCountdownStart}
                    style={countdownStyle}
                  />
                ) : (
                  <i className={fill} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    return <Icon className={ICON_CLASS} glyph={glyph} size={16} />;
  }
  return (
    <>
      <Icon className={PAUSE_UNLESS_REDUCED} glyph={pauseGlyph} size={16} />
      <Icon className={PLAY_IF_REDUCED} glyph={playGlyph} size={16} />
    </>
  );
}
