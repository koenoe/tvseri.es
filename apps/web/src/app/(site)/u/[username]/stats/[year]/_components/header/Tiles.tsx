import { TextLine } from '@/components/ui/ghost/ghosts';
import {
  arrowDownGlyph,
  arrowUpGlyph,
  bingeGlyph,
  calendarGlyph,
  clockGlyph,
  eyeGlyph,
  heartGlyph,
  seasonGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

import {
  getFavoritesCount,
  getSummary,
  isUnavailable,
} from '@/lib/stats/loaders';
import StatsUnavailable from '../../../_components/StatsUnavailable';
import type { SectionProps } from '../types';
import {
  buildTiles,
  directionWord,
  type TileDelta,
  type TileIcon,
  type TileModel,
} from './model';

const GLYPHS: Readonly<Record<TileIcon, Glyph | ToggleGlyph>> = {
  average: calendarGlyph,
  episodes: eyeGlyph,
  favorites: heartGlyph,
  runtime: clockGlyph,
  series: seasonGlyph,
  streak: bingeGlyph,
};

/**
 * The six tiles under the header: 3 × 2 on desktop, 2 × 3 on a phone, each with the cyan ↑ /
 * pink ↓ change and "vs. …".
 */
export default async function Tiles({ state, user, year }: SectionProps) {
  const [summary, favorites] = await Promise.all([
    getSummary(user.id, year),
    getFavoritesCount(user.id, year),
  ]);
  if (isUnavailable(summary) || isUnavailable(favorites)) {
    return (
      <StatsUnavailable placeholder={<TilesSkeleton />} title={'Totals'} />
    );
  }
  const joinedYear = new Date(user.createdAt).getUTCFullYear();
  const tiles = buildTiles({
    favorites,
    firstYear: joinedYear === year && summary.previous.episodeCount === 0,
    summary,
    year,
  });
  const label = `${year}${state === 'current' ? ' so far' : ''} in numbers`;
  return (
    <div className="flex flex-col max-md:mt-1" data-slot="stats-tiles">
      <div
        aria-label={label}
        className="grid grid-cols-2 gap-x-4 gap-y-5 pt-1 md:grid-cols-3 md:gap-x-0 md:gap-y-6 md:pt-0"
        role="group"
      >
        {tiles.map((tile) => (
          <Tile key={tile.icon} tile={tile} />
        ))}
      </div>
    </div>
  );
}

const TILE =
  'flex min-w-0 flex-col gap-1 max-md:border-white/8 max-md:border-t max-md:pt-3.5 md:border-white/8 md:border-l md:px-[18px] md:nth-[3n+1]:border-l-0 md:nth-[3n+1]:pl-0';

function Tile({ tile }: Readonly<{ tile: TileModel }>) {
  const glyph = GLYPHS[tile.icon];
  return (
    <div className={TILE}>
      <span className="flex items-center gap-1.5 whitespace-nowrap text-meta text-white/60">
        <Icon glyph={glyph} size={13} />
        {tile.label}
      </span>
      <span className="whitespace-nowrap text-numeral tabular-nums">
        {tile.value}
      </span>
      <Delta delta={tile.delta} />
    </div>
  );
}

function Delta({ delta }: Readonly<{ delta: TileDelta }>) {
  const { amount, direction, versus } = delta;
  const word = directionWord(direction);
  const arrowClass = cn(
    'inline-flex items-center gap-0.5 whitespace-nowrap font-medium text-caption tabular-nums',
    direction === 'up' ? 'text-cyan' : 'text-pink',
  );
  // one line: where the tile is narrower than the change and its "vs." (a
  // 148px tile at 360: "↓ 35% vs. 4w 4d 4h (2024)" ran into the next one)
  // the "vs." wraps to a second line the tile clips, dropping whole
  return (
    <span className="flex h-5 flex-wrap content-start items-center gap-x-2 gap-y-8 overflow-clip">
      {direction ? (
        <span className={arrowClass}>
          <Icon
            glyph={direction === 'up' ? arrowUpGlyph : arrowDownGlyph}
            size={12}
          />
          <span className="sr-only">{word} </span>
          {amount}
        </span>
      ) : null}
      <span className="max-w-full truncate whitespace-nowrap text-caption text-white/60">
        {versus}
      </span>
    </span>
  );
}

/** A tile's box while it loads: label, number and change as bars */
const TILE_GHOST = `${TILE} h-[95px] overflow-hidden md:h-[88px]`;

/** Six tiles' size while they load: two rows of 88px, or three of 95px */
export function TilesSkeleton() {
  return (
    <div className="flex flex-col max-md:mt-1" data-placeholder="stats-tiles">
      <div
        aria-hidden
        className="grid animate-ghost grid-cols-2 gap-x-4 gap-y-5 pt-1 md:grid-cols-3 md:gap-x-0 md:gap-y-6 md:pt-0"
      >
        {SKELETON_KEYS.map((key) => (
          <div className={TILE_GHOST} key={key}>
            <TextLine className="text-meta" width="w-28" />
            <TextLine bar="h-7" className="text-numeral" width="w-24" />
            <TextLine className="text-caption" width="w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
