import type { ReactNode } from 'react';

import { ROW_IMAGE_SIZES } from '@/components/ui/row/rowLayout';
import cn from '@/lib/cn';

import PosterTile from './PosterTile';
import { numeralFit } from './rankNumeral';

type Props = Readonly<{
  id: number;
  loading?: 'eager' | 'lazy';
  overlay?: ReactNode;
  poster: string;
  rank: number;
  slug: string;
  title: string;
}>;

/**
 * The outlined numeral: 240px Inter
 * 800 at a 290px tile, outlined: a 2px line at white/32, standing on the
 * poster's baseline with its right edge 22px behind the poster. The font is
 * variable, so its glyphs overlap inside (the 4's bar, the 1's foot): a bare
 * stroke draws those seams. The stroke is drawn twice as wide under a fill
 * of the page colour (`paint-order`), which leaves the outer 2px only.
 * Sizes are in `cqw` of the tile, so numeral and poster scale together.
 * Decorative: the rank is in the link's name and the list's order.
 */
const NUMERAL =
  'pointer-events-none absolute bottom-0 font-sans font-[800] leading-[0.8] text-page select-none [paint-order:stroke_fill] [-webkit-text-stroke:max(3px,calc(var(--row-tile)*0.0138))_rgb(255_255_255/0.32)]';

/**
 * One digit: tabular, its box's right edge at 146 of 290 (a 132
 * box with its −0.06em tracking), so a wide digit keeps the frame's 17px
 * from the poster before. Two digits (10 to 20, half the row): a
 * smaller size, −0.05em (the digits never overlap), proportional figures in their natural shape,
 * the last digit partly behind the poster (`numeralFit`).
 */
const DIGITS = {
  one: 'tabular-nums',
  two: 'tracking-[-0.05em] proportional-nums',
} as const;

const tileWidths = (value: number) =>
  `calc(var(--row-tile) * ${value.toFixed(5)})`;

/**
 * A poster in a numbered row: the rank's outlined numeral behind and to the
 * left of the shared poster tile (its hover, Watched label and link), no
 * caption (the title is on the art). A two-digit tile is wider than the
 * row's tile by what its number needs (`data-own-width`: the row lets it). Use it in a `Row tiles="ranked"`.
 *
 * @example
 * <Row id="all-time" tiles="ranked" title="All-time favourites">
 *   {shows.map((show) => <RankedTile key={show.id} {...show} />)}
 * </Row>
 */
export default function RankedTile({
  id,
  loading,
  overlay,
  poster,
  rank,
  slug,
  title,
}: Props) {
  const fit = numeralFit(rank);
  const numeral = cn(NUMERAL, rank > 9 ? DIGITS.two : DIGITS.one);
  const numeralStyle = {
    fontSize: tileWidths(fit.em),
    right: tileWidths(fit.right),
  };
  const ownWidth = fit.tile === 1 ? undefined : '';
  const tileStyle =
    fit.tile === 1 ? undefined : { width: tileWidths(fit.tile) };
  return (
    <div className="relative flex" data-own-width={ownWidth} style={tileStyle}>
      <span aria-hidden className={numeral} style={numeralStyle}>
        {rank}
      </span>
      <div className="relative z-1 ml-auto w-[calc(var(--row-tile)*0.62069)]">
        <PosterTile
          alt={`${rank}. ${title}`}
          id={id}
          loading={loading}
          overlay={overlay}
          poster={poster}
          sizes={ROW_IMAGE_SIZES.ranked}
          slug={slug}
          title={title}
        />
      </div>
    </div>
  );
}
