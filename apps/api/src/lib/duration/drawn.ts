import type {
  DurationShow,
  DurationTiles,
  WhereToStart,
  WhereToStartPick,
} from '@tvseri.es/schemas';

import { preferredBackdropsOf } from '@/lib/preferredBackdrops';

/**
 * The Duration answers drawn with the admins' picks, one batch read per
 * answer. Applied to the day's cached build as it is served, not inside it,
 * so a pick doesn't wait for tomorrow's build.
 */

export const drawnTiles = async (
  value: DurationTiles,
): Promise<DurationTiles> => {
  const draw = await preferredBackdropsOf(
    value.tiles.flatMap((tile) => tile.preview.map((show) => show.id)),
  );
  return {
    tiles: value.tiles.map((tile) => ({
      ...tile,
      preview: tile.preview.map(draw),
    })),
  };
};

/** A list of shows (Finish it this weekend, a tile's page) */
export const drawnShows = async <
  T extends Readonly<{ items: ReadonlyArray<DurationShow> }>,
>(
  value: T,
): Promise<T> => {
  const draw = await preferredBackdropsOf(value.items.map((show) => show.id));
  return { ...value, items: value.items.map(draw) };
};

export const drawnWhereToStart = async (
  value: WhereToStart,
): Promise<WhereToStart> => {
  const draw = await preferredBackdropsOf(
    [...value.picks, ...(value.backups ?? [])].map((pick) => pick.show.id),
  );
  const drawPick = (pick: WhereToStartPick): WhereToStartPick => ({
    ...pick,
    show: draw(pick.show),
  });
  return {
    ...value,
    picks: value.picks.map(drawPick),
    ...(value.backups && { backups: value.backups.map(drawPick) }),
  };
};
