'use client';

import type { Variants } from 'motion/react';
import * as m from 'motion/react-m';
import { type MouseEvent, memo, type Ref } from 'react';

import { HEADER_ICON_BUTTON } from '@/components/header/headerIconButton';

/*
 * The two lines of `menuGlyph` (M4 8h16 M8 16h12) and the cross of
 * `closeGlyph` (M6 6l12 12 M18 6 6 18), as separate paths so they can morph.
 * Opening: the short line extends, then both turn into the cross. Closing
 * plays it backwards.
 */
const TOP = { closed: 'M 4 8 L 20 8', open: 'M 6 6 L 18 18' } as const;
const BOTTOM = {
  closed: 'M 8 16 L 20 16',
  extended: 'M 4 16 L 20 16',
  open: 'M 6 18 L 18 6',
} as const;

// the toggle morphs in 240ms
const TRANSITION = { duration: 0.24, times: [0, 0.5, 1] };

const topVariants: Variants = {
  closed: { d: [TOP.open, TOP.closed, TOP.closed], transition: TRANSITION },
  open: { d: [TOP.closed, TOP.closed, TOP.open], transition: TRANSITION },
};

const bottomVariants: Variants = {
  closed: {
    d: [BOTTOM.open, BOTTOM.extended, BOTTOM.closed],
    transition: TRANSITION,
  },
  open: {
    d: [BOTTOM.closed, BOTTOM.extended, BOTTOM.open],
    transition: TRANSITION,
  },
};

/**
 * The header's menu button: the two lines turn into the cross (and back) in
 * 240ms. A 44px target around the 18px (phone) or 20px icon.
 */
function MenuToggle({
  controls,
  isOpen,
  onClick,
  ref,
}: Readonly<{
  /** id of the menu it opens */
  controls: string;
  isOpen: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
}>) {
  const state = isOpen ? 'open' : 'closed';

  return (
    <button
      aria-controls={controls}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Close menu' : 'Menu'}
      className={HEADER_ICON_BUTTON}
      onClick={onClick}
      ref={ref}
      type="button"
    >
      <m.svg
        animate={state}
        aria-hidden="true"
        className="size-4.5 md:size-5"
        exit="closed"
        fill="none"
        initial={false}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
      >
        <m.path d={TOP.closed} variants={topVariants} />
        <m.path d={BOTTOM.closed} variants={bottomVariants} />
      </m.svg>
    </button>
  );
}

MenuToggle.displayName = 'MenuToggle';

export default memo(MenuToggle);
