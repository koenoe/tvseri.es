'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';

import ExpandChevron from '@/components/ui/icon/ExpandChevron';
import cn from '@/lib/cn';

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

const TOGGLE =
  'inline-flex cursor-pointer items-center gap-1 text-body-sm font-medium text-white';

/**
 * Text clamped to three lines with More / Less under it, only when the clamp
 * cuts it. Once mounted the clamp's real overflow decides, again whenever its
 * width or the font changes. A click on the clamped text opens it too; the
 * button is the accessible way.
 */
export default function ClampedText({
  className,
  fit,
  text,
  textClassName,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  /** null until measured: the length guess holds until then */
  const [clipped, setClipped] = useState<boolean | null>(null);
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || open) {
      return;
    }
    const measure = () =>
      setClipped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // A late web font rewraps the text without resizing the clamped box
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [open]);

  const guess = guessToggleClass(text.length, fit);
  const folded = clipped === true && !open;
  const classes = cn(
    'w-full',
    textClassName,
    !open && 'line-clamp-3',
    folded && 'cursor-pointer',
  );
  const showToggle = open || (clipped === null ? guess !== null : clipped);
  const toggleClasses = cn(TOGGLE, clipped === null && guess);
  const label = open ? 'Less' : 'More';
  const toggle = () => setOpen((value) => !value);
  // A convenience for pointers only: selecting text must not open it
  const openFromText = () => {
    if (folded && !window.getSelection()?.toString()) {
      setOpen(true);
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
          {label}
          <ExpandChevron open={open} size={13} />
        </button>
      ) : null}
    </div>
  );
}
