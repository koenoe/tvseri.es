'use client';

import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { LIBRARY_POSTER_CIRCLE } from '@/components/ui/button/posterCircleLooks';

import { checkGlyph, heartGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import PosterArt from '@/components/ui/tile/PosterArt';
import TileLink from '@/components/ui/tile/TileLink';
import { useListToggle } from '@/lib/marking/toggles';
import showPath from '@/lib/routing/showPath';
import type { SeenShow } from '../../_components/overview/get-started/loadGetStarted';
import { SeenTile } from '../../_components/overview/get-started/SeenGrid';
import {
  LIBRARY_CELL,
  LIBRARY_GRID,
  POSTER_VARS,
  TILE_SIZES,
} from './gridStyles';
import { AddToMine } from './TileOverlays';

export type PopularPick = Readonly<{
  id: number;
  slug: string;
  title: string;
  poster: string;
}>;

const PICK_LINK = 'flex flex-col gap-2.5 rounded-10';

/** Dimmed until the pointer or focus reaches the tile */
const PICK_LINK_DIMMED = `${PICK_LINK} opacity-60 transition-opacity duration-160 group-hover/fp:opacity-100 focus-visible:opacity-100`;

/**
 * A suggested show in the shelf's grid: the poster and its title as one
 * link, the pick's action over the poster's corner
 */
function PickTile({
  action,
  dimmed = false,
  pick,
}: Readonly<{ action: ReactNode; dimmed?: boolean; pick: PopularPick }>) {
  return (
    <li className={`${LIBRARY_CELL} group/fp relative`}>
      <TileLink
        className={dimmed ? PICK_LINK_DIMMED : PICK_LINK}
        href={showPath(pick.id, pick.slug)}
      >
        <span className="block" style={POSTER_VARS}>
          <PosterArt
            loading="lazy"
            poster={pick.poster}
            sizes={TILE_SIZES}
            title={pick.title}
          />
        </span>
        <span className="truncate text-[13px] leading-5 font-semibold md:text-[14px]">
          {pick.title}
        </span>
      </TileLink>
      <span className="pointer-events-none absolute inset-x-0 top-0 aspect-2/3 [&>*]:pointer-events-auto">
        {action}
      </span>
    </li>
  );
}

/** An emptied Watchlist's "Popular this week": posters with + */
export function PopularPicks({
  picks,
}: Readonly<{ picks: ReadonlyArray<PopularPick> }>) {
  return (
    <ul className={LIBRARY_GRID}>
      {picks.map((pick) => (
        <PickTile
          action={<AddToMine id={pick.id} title={pick.title} />}
          key={pick.id}
          pick={pick}
        />
      ))}
    </ul>
  );
}

/** One row of the day-0 grid */
const SEEN_PICKS = 5;

/** Day 0's Finished: popular posters to mark as seen (Get started's `SeenTile`), in the shelf's grid */
export function SeenPicks({
  shows,
}: Readonly<{ shows: ReadonlyArray<SeenShow> }>) {
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set());
  const onSeen = useCallback(
    (id: number) => setSeen((was) => new Set([...was, id])),
    [],
  );
  return (
    <ul className={LIBRARY_GRID}>
      {shows.slice(0, SEEN_PICKS).map((show) => (
        <li className={`${LIBRARY_CELL} [&>button]:w-full`} key={show.id}>
          <SeenTile onSeen={onSeen} seen={seen.has(show.id)} show={show} />
        </li>
      ))}
    </ul>
  );
}

/** The heart on a suggested favourite: adds it; a check once it is in */
function AddFavourite({ id, title }: Readonly<{ id: number; title: string }>) {
  const { isOn, toggle } = useListToggle(id, 'favorites');
  const label = isOn
    ? `${title} is in my favourites`
    : `Add ${title} to my favourites`;
  return (
    <button
      aria-label={label}
      aria-pressed={isOn}
      className={LIBRARY_POSTER_CIRCLE.off}
      onClick={toggle}
      title={label}
      type="button"
    >
      <Icon glyph={isOn ? checkGlyph : heartGlyph} size={16} />
    </button>
  );
}

/**
 * An empty Favourites: shows you finished,
 * dimmed until you pick one, each with a heart that adds it.
 */
export function FavouritePicks({
  picks,
}: Readonly<{ picks: ReadonlyArray<PopularPick> }>) {
  return (
    <ul className={LIBRARY_GRID}>
      {picks.map((pick) => (
        <PickTile
          action={<AddFavourite id={pick.id} title={pick.title} />}
          dimmed
          key={pick.id}
          pick={pick}
        />
      ))}
    </ul>
  );
}
