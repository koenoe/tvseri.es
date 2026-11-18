'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { useCallback } from 'react';

import cn from '@/lib/cn';

import { step } from '../picker';

const DIRECTION: Readonly<Record<string, -1 | 1>> = {
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
};

const checked = (strip: HTMLElement) =>
  strip.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');

/** Centres the picked option when the strip appears (never scrolls the page). */
const centrePicked = (strip: HTMLDivElement | null) => {
  const option = strip && checked(strip);
  if (strip && option) {
    strip.scrollLeft =
      option.offsetLeft - (strip.clientWidth - option.offsetWidth) / 2;
  }
};

/**
 * A radio group of options in one scrolling row, with
 * roving focus. ←/→ (and ↑/↓) step to the next option and pick it, keeping it
 * in view; Tab leaves the row.
 */
export default function Strip({
  children,
  className,
  keys,
  label,
  onPick,
  picked,
}: Readonly<{
  children: ReactNode;
  className?: string;
  keys: ReadonlyArray<string>;
  label: string;
  onPick: (key: string) => void;
  picked: string | null;
}>) {
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const direction = DIRECTION[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      const next = step(keys, picked, direction);
      if (next === undefined) {
        return;
      }
      onPick(next);
      const strip = event.currentTarget;
      requestAnimationFrame(() => {
        const option = checked(strip);
        option?.focus({ preventScroll: true });
        option?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    },
    [keys, onPick, picked],
  );

  const stripClass = cn(
    '-m-[3px] flex min-w-0 gap-2 overflow-x-auto overflow-y-hidden scroll-smooth p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    className,
  );
  return (
    <div
      aria-label={label}
      className={stripClass}
      onKeyDown={onKeyDown}
      ref={centrePicked}
      role="radiogroup"
    >
      {children}
    </div>
  );
}
