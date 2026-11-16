import type { WallGrid } from './wall';

/**
 * Where everything sits on each card, in px (the story and
 * the square at 1080 wide). The card keeps its own pixel scale, exempt from
 * the type tokens: story 300 / 72 / 54 / 32, square 180 / 56 / 42 / 28. The
 * og:image (1200 × 630) is the square's parts at 0.8 in one landscape row:
 * text and week lines on the left, the square's 5 × 4 wall on the right.
 */

type Spot = Readonly<{ left: number; top: number }>;

export type CardLayout = Readonly<{
  width: number;
  height: number;
  /** 1 px at this scale: hairlines, the bracket's border, shadows */
  unit: number;
  logo: Spot & Readonly<{ height: number }>;
  /** Right-aligned to `right` px from the card's right edge */
  handle: Readonly<{ right: number; top: number; size: number }>;
  year: Spot & Readonly<{ size: number }>;
  headline: Spot & Readonly<{ width: number; size: number }>;
  stats: Readonly<{
    /** Between value and label */
    gap: number;
    value: number;
    label: number;
    runtime: Spot;
    episodes: Spot;
    shows: Spot;
  }>;
  wall: WallGrid;
  /** The #1 poster's hours chip, `inset` px from its bottom-left corner */
  chip: Readonly<{
    inset: number;
    height: number;
    padding: number;
    radius: number;
    size: number;
  }>;
  weeks: Spot &
    Readonly<{
      width: number;
      height: number;
      lineWidth: number;
      /** Bracket: this far under the lines, this tall */
      bracketGap: number;
      bracketHeight: number;
      /** The streak line: this far under the bracket's top */
      lineGap: number;
      lineSize: number;
      /** With no wall the week lines move up here (the story) */
      topWithoutWall: number | null;
    }>;
}>;

export type CardLayoutName = 'story' | 'square' | 'og';

export const CARD_LAYOUTS: Readonly<Record<CardLayoutName, CardLayout>> = {
  og: {
    chip: { height: 39, inset: 11, padding: 11, radius: 11, size: 22 },
    handle: { right: 540, size: 34, top: 56 },
    headline: { left: 56, size: 45, top: 244, width: 600 },
    height: 630,
    logo: { height: 22, left: 56, top: 64 },
    stats: {
      episodes: { left: 336, top: 366 },
      gap: 6,
      label: 22,
      runtime: { left: 56, top: 366 },
      shows: { left: 460, top: 366 },
      value: 45,
    },
    unit: 1,
    wall: { cols: 5, gap: 8, left: 700, rows: 4, top: 56, width: 443 },
    weeks: {
      bracketGap: 6,
      bracketHeight: 10,
      height: 52,
      left: 56,
      lineGap: 20,
      lineSize: 22,
      lineWidth: 4,
      top: 478,
      topWithoutWall: null,
      width: 604,
    },
    width: 1200,
    year: { left: 52, size: 144, top: 112 },
  },
  square: {
    chip: { height: 49, inset: 14, padding: 14, radius: 14, size: 28 },
    handle: { right: 72, size: 42, top: 64 },
    headline: { left: 72, size: 56, top: 312, width: 440 },
    height: 1080,
    logo: { height: 28, left: 72, top: 74 },
    stats: {
      episodes: { left: 72, top: 590 },
      gap: 8,
      label: 28,
      runtime: { left: 72, top: 470 },
      shows: { left: 252, top: 590 },
      value: 56,
    },
    unit: 1,
    wall: { cols: 5, gap: 10, left: 552, rows: 4, top: 156, width: 456 },
    weeks: {
      bracketGap: 8,
      bracketHeight: 12,
      height: 100,
      left: 72,
      lineGap: 26,
      lineSize: 28,
      lineWidth: 5,
      top: 760,
      topWithoutWall: null,
      width: 936,
    },
    width: 1080,
    year: { left: 67, size: 180, top: 152 },
  },
  story: {
    chip: { height: 56, inset: 16, padding: 16, radius: 16, size: 32 },
    handle: { right: 90, size: 54, top: 180 },
    headline: { left: 90, size: 72, top: 568, width: 900 },
    height: 1920,
    logo: { height: 32, left: 90, top: 194 },
    stats: {
      episodes: { left: 500, top: 1531 },
      gap: 12,
      label: 32,
      runtime: { left: 90, top: 1531 },
      shows: { left: 705, top: 1531 },
      value: 72,
    },
    unit: 1,
    wall: { cols: 8, gap: 10, left: 90, rows: 3, top: 760, width: 900 },
    weeks: {
      bracketGap: 10,
      bracketHeight: 14,
      height: 100,
      left: 90,
      lineGap: 30,
      lineSize: 32,
      lineWidth: 6,
      top: 1303,
      topWithoutWall: 760,
      width: 900,
    },
    width: 1080,
    year: { left: 82, size: 300, top: 272 },
  },
};

/** Grid counts, not lengths */
const COUNTS = new Set(['cols', 'rows']);

const scaleValue = (value: unknown, key: string, factor: number): unknown => {
  if (typeof value === 'number') {
    return COUNTS.has(key) ? value : value * factor;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        scaleValue(item, name, factor),
      ]),
    );
  }
  return value;
};

/**
 * The layout at `factor` (the sidebar thumbnail): every length scales, the
 * wall's cell counts don't. Satori can't scale the card with a transform
 * (it drops absolutely positioned images under one), so the thumbnail is
 * laid out small instead.
 */
export const scaleLayout = (layout: CardLayout, factor: number): CardLayout =>
  scaleValue(layout, '', factor) as CardLayout;
