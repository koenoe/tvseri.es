'use client';

import { useId, useRef } from 'react';

import { HIT_ALL } from '@/components/ui/button/hitArea';
import cn from '@/lib/cn';

import FoldLabel from './FoldLabel';
import useClampFold from './useClampFold';

/**
 * The longest text, in characters, that three lines always hold: `base` at
 * every width, `md` from the md breakpoint up when the text runs wider there.
 */
export type ClampFit = Readonly<{ base: number; md?: number }>;

type Props = Readonly<{
  /** the wrapper's classes: its place in the caller's layout */
  className?: string;
  fit: ClampFit;
  text: string;
  /** the text's own type and colour */
  textClassName: string;
}>;

/**
 * Before the clamp is measured (the server render and hydration) the toggle
 * follows the text's length per breakpoint, so a text that clearly fits
 * paints without it and one that clearly overflows paints with it.
 */
export function guessToggleClass(
  length: number,
  { base, md = base }: ClampFit,
): string | null {
  const overBase = length > base;
  const overMd = length > md;
  if (!(overBase || overMd)) {
    return null;
  }
  return cn(!overBase && 'max-md:hidden', !overMd && 'md:hidden');
}

/** About 24px tall, 40 to the pointer */
const TOGGLE = `${HIT_ALL[8]} relative inline-flex cursor-pointer items-center gap-1 text-body-sm font-medium text-white`;

/**
 * Text clamped to three lines with More / Less under it, only when the clamp
 * cuts it. Once mounted the clamp's real overflow decides, again whenever its
 * width or the font changes. It opens and shuts at the fold's pace
 * (`useClampFold`). A click on the clamped text opens it too; the button is
 * the accessible way.
 */
export default function ClampedText({
  className,
  fit,
  text,
  textClassName,
}: Props) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const { clamped, clipped, moving, open, toggle } = useClampFold(ref);

  const guess = guessToggleClass(text.length, fit);
  const folded = clipped === true && clamped;
  const classes = cn(
    'w-full',
    textClassName,
    clamped && 'line-clamp-3',
    moving && 'overflow-hidden',
    folded && 'cursor-pointer',
  );
  const showToggle = !clamped || (clipped === null ? guess !== null : clipped);
  const toggleClasses = cn(TOGGLE, clipped === null && guess);
  // A convenience for pointers only: selecting text must not open it
  const openFromText = () => {
    if (folded && !window.getSelection()?.toString()) {
      toggle();
    }
  };

  const wrapperClasses = cn('flex flex-col items-start gap-2', className);

  return (
    <div className={wrapperClasses}>
      {/* No key handler: the More button is the keyboard and screen reader path */}
      <p className={classes} id={id} onClick={openFromText} ref={ref}>
        {text}
      </p>
      {showToggle ? (
        <button
          aria-controls={id}
          aria-expanded={open}
          className={toggleClasses}
          onClick={toggle}
          type="button"
        >
          <FoldLabel label="More" open={open} openLabel="Less" size={13} />
        </button>
      ) : null}
    </div>
  );
}
