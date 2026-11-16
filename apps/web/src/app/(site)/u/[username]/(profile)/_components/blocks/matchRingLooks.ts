/** One drawn size of the ring: its box, radius and the svg's classes */
export type RingSize = Readonly<{
  box: number;
  className: string;
  radius: number;
}>;

/** How one place draws the ring */
export type RingLook = Readonly<{
  /** One per breakpoint where the ring changes size */
  sizes: ReadonlyArray<RingSize>;
  stroke: number;
  /** A Super ring's halo: a blurred copy of the arc behind it */
  halo: string | null;
  /** A Super arc's own glow */
  glow: string | null;
}>;

/** A ring with the shared count in its middle */
export type CountedRingLook = RingLook &
  Readonly<{
    /** The ring's box */
    frame: string;
    /** The count's layer over the ring */
    count: string;
    /** The count's type */
    number: string;
  }>;

const HALO = 'opacity-60 blur-[5px]';

/*
 * Each place keeps its signed-off look (owner, 15 Nov 2026); unify only with
 * his approval.
 */

/** The visitor's match card: 72px, a 6px stroke, Super's blurred halo */
export const MATCH_CARD_RING: CountedRingLook = {
  count:
    'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 pt-px',
  frame: 'relative size-[72px] shrink-0',
  glow: null,
  halo: HALO,
  number: 'text-title-3 font-semibold tabular-nums',
  sizes: [{ box: 72, className: 'absolute top-0 left-0 block', radius: 32 }],
  stroke: 6,
};

/** The Circle page's rows: 48px on a phone, 56px from md, a 4px stroke, Super's halo */
export const CIRCLE_ROW_RING: CountedRingLook = {
  count: 'absolute inset-0 flex flex-col items-center justify-center',
  frame: 'relative',
  glow: null,
  halo: HALO,
  number:
    'text-[12px] leading-[18px] font-semibold tabular-nums md:text-[16px]',
  sizes: [
    { box: 48, className: 'absolute inset-0 block md:hidden', radius: 20 },
    { box: 56, className: 'absolute inset-0 block max-md:hidden', radius: 24 },
  ],
  stroke: 4,
};

/** The overview's "From your circle" chip: 18px, a 2px stroke, Super glows; no count */
export const CHIP_RING: RingLook = {
  glow: 'drop-shadow-[0_0_3px_rgb(143_220_90/0.65)]',
  halo: null,
  sizes: [{ box: 18, className: 'block shrink-0 overflow-visible', radius: 7 }],
  stroke: 2,
};
