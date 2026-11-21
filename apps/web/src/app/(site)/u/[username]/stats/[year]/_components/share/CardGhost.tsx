import type { CSSProperties } from 'react';

import { Ghost, PULSE } from '@/components/ui/ghost/ghosts';

import type { CardFormat } from '../../_card/cardRequest';
import { CARD_LAYOUTS, type CardLayout } from '../../_card/layout';
import { wallCapacity, wallLayout } from '../../_card/wall';

/** A block on the card, in the card's own px (1080 wide) */
type Box = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}>;

/** A text bar: about a cap height tall, rounded like the app's ghost lines */
const bar = (left: number, top: number, width: number, size: number): Box => ({
  height: size * 0.72,
  left,
  radius: size * 0.2,
  top,
  width,
});

/** A value over its label (hours, episodes, shows) */
const stat = (
  { gap, label, value }: CardLayout['stats'],
  { left, top }: Readonly<{ left: number; top: number }>,
): ReadonlyArray<Box> => [
  bar(left, top, value * 2.2, value),
  bar(left, top + value + gap, label * 3.6, label),
];

/**
 * The card's blocks where the card draws them (`_card/layout.ts`): the
 * logo, the handle, the year, the headline's two lines, the stats, a full
 * poster wall and the week lines. Text widths are typical, not measured.
 */
function cardGhostBoxes(layout: CardLayout): ReadonlyArray<Box> {
  const { handle, headline, logo, stats, wall, weeks, year } = layout;
  const handleWidth = handle.size * 4;
  const lineGap = headline.size * 1.2;
  const posters = wallLayout(wall, wallCapacity(wall));
  return [
    bar(logo.left, logo.top, logo.height * 5.169, logo.height / 0.72),
    bar(
      layout.width - handle.right - handleWidth,
      handle.top,
      handleWidth,
      handle.size,
    ),
    bar(year.left, year.top, year.size * 2.3, year.size),
    bar(headline.left, headline.top, headline.width, headline.size),
    bar(
      headline.left,
      headline.top + lineGap,
      headline.width * 0.6,
      headline.size,
    ),
    ...stat(stats, stats.runtime),
    ...stat(stats, stats.episodes),
    ...stat(stats, stats.shows),
    ...posters,
    {
      height: weeks.height,
      left: weeks.left,
      radius: weeks.lineWidth,
      top: weeks.top,
      width: weeks.width,
    },
  ];
}

const placed = (box: Box, scale: number): CSSProperties => ({
  borderRadius: box.radius * scale,
  height: box.height * scale,
  left: box.left * scale,
  position: 'absolute',
  top: box.top * scale,
  width: box.width * scale,
});

/**
 * The card still being made: its blocks as ghosts at the preview's scale,
 * pulsing as one layer (`PULSE`), so the wait reads as this card arriving.
 */
export default function CardGhost({
  format,
  width,
}: Readonly<{ format: CardFormat; width: number }>) {
  const layout = CARD_LAYOUTS[format];
  const scale = width / layout.width;
  const boxes = cardGhostBoxes(layout);
  const layer = `absolute inset-0 ${PULSE}`;
  return (
    <span aria-hidden className={layer} data-card-ghost="">
      {boxes.map((box) => {
        const style = placed(box, scale);
        return (
          <Ghost className="" key={`${box.left}:${box.top}`} style={style} />
        );
      })}
    </span>
  );
}
