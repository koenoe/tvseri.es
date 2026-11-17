'use client';

import type { ReactNode } from 'react';

import Icon from '@/components/ui/icon/Icon';
import PosterArt from '@/components/ui/tile/PosterArt';
import type { TileView } from '@/lib/profile/tileView';
import { FACT_GLYPH } from '../_lib/factGlyphs';
import { POSTER_VARS } from './gridStyles';
import { HeartBadge, ProgressLine } from './TileOverlays';
import { useTileContext } from './tileContext';

const FACT = 'inline-flex min-w-0 max-w-full items-center gap-1.5';
const FACT_AT_END = `${FACT} ml-auto`;

/** The tile's title and its one meta line (`.tx`) */
export function TileText({ tile }: Readonly<{ tile: TileView }>) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[13px] leading-5 font-semibold text-white md:text-[14px]">
        {tile.title}
      </span>
      {/* one line: a fact that doesn't fit beside the ones before it wraps
          to another line the row clips away (drops whole, never "11 to…");
          a fact wider than the whole line ends with an ellipsis. The
          lines stack upwards (`wrap-reverse`), so a dropped fact's box stays
          inside the tile, never below the grid */}
      <span className="flex h-5 min-w-0 flex-wrap-reverse content-start items-center gap-x-2 gap-y-8 overflow-clip text-[12px] leading-5 whitespace-nowrap text-white/60 md:gap-x-3 md:text-[13px]">
        {tile.code ? (
          <span className="inline-flex h-5 shrink-0 items-center rounded-6 bg-white/10 px-[5px] text-[11px] font-semibold text-white tabular-nums">
            {tile.code}
          </span>
        ) : null}
        {tile.meta.map((fact, index) => {
          const glyph = FACT_GLYPH[fact.kind];
          // beside the code badge the text ends on the poster's right edge
          const place = tile.code && index === 0 ? FACT_AT_END : FACT;
          return (
            <span className={place} key={fact.text}>
              {glyph ? (
                <Icon className="shrink-0" glyph={glyph} size={13} />
              ) : null}
              <span className="min-w-0 overflow-hidden text-ellipsis">
                {fact.text}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** The poster with what sits on it */
export function Poster({
  children,
  eager,
  sizes,
  tile,
}: Readonly<{
  children?: ReactNode;
  /** The first ten posters load at once, the rest when near */
  eager: boolean;
  sizes: string;
  tile: TileView;
}>) {
  // a visitor's tiles carry the relation pill instead
  const { owner } = useTileContext();
  return (
    <span
      className="relative block transition-transform duration-160 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/lt:-translate-y-0.5"
      style={POSTER_VARS}
    >
      <PosterArt
        loading={eager ? 'eager' : 'lazy'}
        poster={tile.posterImage}
        sizes={sizes}
        title={tile.title}
      />
      {tile.line ? (
        <ProgressLine aired={tile.line.aired} watched={tile.line.watched} />
      ) : null}
      {tile.heart && owner ? <HeartBadge /> : null}
      {children}
    </span>
  );
}
