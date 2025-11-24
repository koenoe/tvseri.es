import type { TvSeries, WatchedItem } from '@tvseri.es/schemas';
import { createStore, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

import calculateProgress from '@/utils/calculateProgress';

type WatchedItemForStore = Pick<
  WatchedItem,
  'seasonNumber' | 'episodeNumber' | 'runtime' | 'watchedAt'
>;

type WatchedStateItem = {
  tvSeries: TvSeries;
  watched: Record<number, Record<number, WatchedItemForStore>>;
};

type WatchedState = Record<number, WatchedStateItem>;

type WatchedActions = {
  isReady: (tvSeriesId: number) => boolean;
  addTvSeries: (tvSeries: TvSeries, watched: WatchedItem[]) => void;
  markAsWatched: (
    tvSeriesId: number,
    items: Omit<WatchedItemForStore, 'watchedAt'>[],
  ) => void;
  unmarkAsWatched: (
    tvSeriesId: number,
    options: Readonly<{
      seasonNumber?: number;
      episodeNumber?: number;
    }>,
  ) => void;
  isWatched: (
    tvSeriesId: number,
    options: Readonly<{
      seasonNumber?: number;
      episodeNumber?: number;
    }>,
  ) => boolean;
  getWatchedProgress: (tvSeriesId: number) => Readonly<{
    totalRuntime: number;
    progress: number;
    numberOfWatched: number;
  }>;
};

export type WatchedStore = WatchedState & WatchedActions;

export const createWatchedStore = () => {
  const storeCreator: StateCreator<WatchedStore> = (set, get) => ({
    addTvSeries: (tvSeries, initialWatched) =>
      set((state) => {
        const initialWatchedState: Record<
          number,
          Record<number, WatchedItemForStore>
        > = {};

        initialWatched.forEach((item) => {
          if (!initialWatchedState[item.seasonNumber]) {
            initialWatchedState[item.seasonNumber] = {};
          }
          initialWatchedState[item.seasonNumber]![item.episodeNumber] = {
            episodeNumber: item.episodeNumber,
            runtime: item.runtime,
            seasonNumber: item.seasonNumber,
            watchedAt: item.watchedAt,
          };
        });

        return {
          ...state,
          [tvSeries.id]: {
            tvSeries,
            watched: initialWatchedState,
          },
        };
      }),

    getWatchedProgress: (tvSeriesId) => {
      const state = get();
      const series = state[tvSeriesId];
      if (!series) {
        return {
          numberOfWatched: 0,
          progress: 0,
          totalRuntime: 0,
        };
      }

      type Accumulator = {
        totalRuntime: number;
        numberOfWatched: number;
      };

      const { totalRuntime, numberOfWatched } = Object.values(
        series.watched,
      ).reduce<Accumulator>(
        (acc, season) => ({
          numberOfWatched: acc.numberOfWatched + Object.keys(season).length,
          totalRuntime:
            acc.totalRuntime +
            Object.values(season).reduce(
              (seasonRuntime, episode) => seasonRuntime + episode.runtime,
              0,
            ),
        }),
        { numberOfWatched: 0, totalRuntime: 0 },
      );

      const numberOfEpisodes =
        series.tvSeries.numberOfAiredEpisodes ||
        series.tvSeries.numberOfEpisodes ||
        0;

      const progress =
        numberOfWatched > 0 && numberOfEpisodes > 0
          ? calculateProgress(numberOfWatched, numberOfEpisodes)
          : 0;

      return {
        numberOfWatched,
        progress,
        totalRuntime,
      };
    },
    isReady: (tvSeriesId) => {
      const state = get();
      return Boolean(state[tvSeriesId]);
    },

    isWatched: (tvSeriesId, options) => {
      const state = get();
      const tvSeriesState = state[tvSeriesId];

      if (!tvSeriesState) {
        return false;
      }

      if (!options || (!options.seasonNumber && !options.episodeNumber)) {
        const numberOfWatched = Object.values(tvSeriesState.watched).reduce(
          (total, season) => total + Object.keys(season).length,
          0,
        );

        return (
          numberOfWatched > 0 &&
          tvSeriesState.tvSeries.numberOfAiredEpisodes > 0 &&
          numberOfWatched >= tvSeriesState.tvSeries.numberOfAiredEpisodes
        );
      }

      const { seasonNumber, episodeNumber } = options;

      if (seasonNumber && !episodeNumber) {
        const season = tvSeriesState.tvSeries.seasons?.find(
          (s) => s.seasonNumber === seasonNumber,
        );
        const totalEpisodesInSeason =
          season?.numberOfAiredEpisodes || season?.numberOfEpisodes || 0;
        const watchedEpisodesInSeason =
          tvSeriesState.watched[seasonNumber] || {};
        const numberOfWatchedInSeason = Object.keys(
          watchedEpisodesInSeason,
        ).length;

        return (
          numberOfWatchedInSeason > 0 &&
          totalEpisodesInSeason > 0 &&
          numberOfWatchedInSeason >= totalEpisodesInSeason
        );
      }

      if (seasonNumber && episodeNumber) {
        return Boolean(tvSeriesState.watched[seasonNumber]?.[episodeNumber]);
      }

      return false;
    },

    markAsWatched: (tvSeriesId, items) =>
      set((state) => {
        const series = state[tvSeriesId];
        if (!series) {
          return state;
        }

        const newWatched = { ...series.watched };
        const now = Date.now();

        items.forEach((item) => {
          if (!newWatched[item.seasonNumber]) {
            newWatched[item.seasonNumber] = {};
          }
          newWatched[item.seasonNumber]![item.episodeNumber] = {
            ...item,
            watchedAt: now,
          };
        });

        return {
          ...state,
          [tvSeriesId]: {
            ...series,
            watched: newWatched,
          },
        };
      }),

    unmarkAsWatched: (tvSeriesId, options) =>
      set((state) => {
        const series = state[tvSeriesId];
        if (!series) {
          return state;
        }

        const newWatched = { ...series.watched };

        if (!options || (!options.seasonNumber && !options.episodeNumber)) {
          return {
            ...state,
            [tvSeriesId]: {
              ...series,
              watched: {},
            },
          };
        }

        const { seasonNumber, episodeNumber } = options;

        if (seasonNumber && !episodeNumber) {
          delete newWatched[seasonNumber];
          return {
            ...state,
            [tvSeriesId]: {
              ...series,
              watched: newWatched,
            },
          };
        }

        if (seasonNumber && episodeNumber && newWatched[seasonNumber]) {
          delete newWatched[seasonNumber][episodeNumber];

          if (Object.keys(newWatched[seasonNumber]).length === 0) {
            delete newWatched[seasonNumber];
          }
        }

        return {
          ...state,
          [tvSeriesId]: {
            ...series,
            watched: newWatched,
          },
        };
      }),
  });

  return createStore(
    devtools(storeCreator, {
      name: 'watched',
      store: 'watched',
    }),
  );
};
