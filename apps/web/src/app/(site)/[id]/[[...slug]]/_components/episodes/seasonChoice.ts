'use client';

import { create } from 'zustand';

/**
 * `?season=N`, read in a Suspense island (`SeasonParam`), for the section:
 * the client-side override of the viewer's default season. Keyed by show.
 * Written only in the browser (a layout effect), so the server's module
 * state never carries a viewer's choice.
 */
type SeasonChoice = Readonly<{
  fromUrl: Readonly<Record<number, number>>;
}>;

const useSeasonChoice = create<SeasonChoice>()(() => ({
  fromUrl: {},
}));

export const chooseFromUrl = (seriesId: number, seasonNumber: number) =>
  useSeasonChoice.setState((state) =>
    state.fromUrl[seriesId] === seasonNumber
      ? state
      : { fromUrl: { ...state.fromUrl, [seriesId]: seasonNumber } },
  );

/** `?season` wins over the viewer's default season (from the server). */
export function useChosenSeason(
  seriesId: number,
  defaultSeason: number,
): number {
  const fromUrl = useSeasonChoice((state) => state.fromUrl[seriesId]);
  return fromUrl ?? defaultSeason;
}
