import type { ListItem, Season, User, WatchedItem } from '@tvseri.es/schemas';
import { headers } from 'next/headers';
import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import {
  fetchTvSeriesSeason,
  fetchTvSeriesWatchProvider,
  getAllWatchedForTvSeries,
  markWatched,
  removeFromList,
} from '@/lib/api';
import { formatSeasonAndEpisode } from '@/utils/formatSeasonAndEpisode';
import InProgress from './InProgress';

function extractCurrentSeasonFromWatchedItems(
  watchedItems: WatchedItem[],
  seasons: Season[],
) {
  if (watchedItems.length === 0 || seasons.length === 0) {
    return { currentSeason: undefined, watchCount: 0 };
  }

  const watchCounts = watchedItems.reduce(
    (acc, item) => {
      acc[item.seasonNumber] = (acc[item.seasonNumber] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const sortedSeasons = [...seasons].sort(
    (a, b) => a.seasonNumber - b.seasonNumber,
  );

  const lastWatched = [...watchedItems].sort((a, b) => {
    return formatSeasonAndEpisode({
      episodeNumber: b.episodeNumber ?? 0,
      seasonNumber: b.seasonNumber ?? 0,
    }).localeCompare(
      formatSeasonAndEpisode({
        episodeNumber: a.episodeNumber ?? 0,
        seasonNumber: a.seasonNumber ?? 0,
      }),
    );
  })[0];

  const lastWatchedSeason = sortedSeasons.find(
    (season) => season.seasonNumber === lastWatched?.seasonNumber,
  );

  if (lastWatchedSeason) {
    const watchCount = watchCounts[lastWatchedSeason.seasonNumber] || 0;
    const isSeasonFinished =
      watchCount >=
      (lastWatchedSeason.numberOfAiredEpisodes ||
        lastWatchedSeason.numberOfEpisodes ||
        0);

    if (!isSeasonFinished) {
      return {
        currentSeason: lastWatchedSeason,
        watchCount,
      };
    }

    const nextSeasonIndex =
      sortedSeasons.findIndex(
        (season) => season.seasonNumber === lastWatchedSeason.seasonNumber,
      ) + 1;

    if (nextSeasonIndex < sortedSeasons.length) {
      const nextSeason = sortedSeasons[nextSeasonIndex];

      if (nextSeason?.numberOfAiredEpisodes) {
        return {
          currentSeason: nextSeason,
          watchCount: watchCounts[nextSeason.seasonNumber] || 0,
        };
      }
    }
  }

  const firstUnfinishedSeason = sortedSeasons.find((season) => {
    if (season.numberOfAiredEpisodes === 0) {
      return false;
    }
    const count = watchCounts[season.seasonNumber] || 0;
    return (
      count < (season.numberOfAiredEpisodes || season.numberOfEpisodes || 0)
    );
  });

  return {
    currentSeason: firstUnfinishedSeason,
    watchCount: firstUnfinishedSeason
      ? watchCounts[firstUnfinishedSeason.seasonNumber] || 0
      : 0,
  };
}

export default async function InProgressContainer({
  item,
  user,
}: Readonly<{
  item: ListItem;
  user: User;
}>) {
  const [
    { user: authenticatedUser, encryptedSessionId, session },
    tvSeries,
    watchedItems,
  ] = await Promise.all([
    auth(),
    cachedTvSeries(item.id, { includeImages: true }),
    getAllWatchedForTvSeries({
      seriesId: item.id,
      userId: user.id,
    }),
  ]);

  const { currentSeason, watchCount } = extractCurrentSeasonFromWatchedItems(
    watchedItems,
    tvSeries!.seasons ?? [],
  );

  const removeAction = async () => {
    'use server';

    if (authenticatedUser?.id !== user.id || !encryptedSessionId) {
      return;
    }

    try {
      await removeFromList({
        id: tvSeries!.id,
        listId: 'IN_PROGRESS',
        sessionId: encryptedSessionId,
        userId: user.id,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const markNextAsWatchedAction = async () => {
    'use server';

    if (
      authenticatedUser?.id !== user.id ||
      !encryptedSessionId ||
      !currentSeason
    ) {
      return;
    }

    try {
      const season = await fetchTvSeriesSeason(
        tvSeries!.id,
        currentSeason.seasonNumber,
      );

      if (!season) {
        return;
      }

      const watchedEpisodeNumbers = new Set(
        watchedItems
          .filter((item) => item.seasonNumber === season.seasonNumber)
          .map((item) => item.episodeNumber),
      );

      const nextUnwatchedEpisode = season.episodes
        .filter((episode) => episode.hasAired)
        .sort((a, b) => a.episodeNumber - b.episodeNumber)
        .find((episode) => !watchedEpisodeNumbers.has(episode.episodeNumber));

      if (!nextUnwatchedEpisode) {
        return;
      }

      const headerStore = await headers();
      const region =
        session?.country ||
        headerStore.get('cloudfront-viewer-country') ||
        'US';
      const watchProvider =
        (await fetchTvSeriesWatchProvider(
          tvSeries!.id,
          region,
          encryptedSessionId ?? undefined,
        )) ?? null;

      await markWatched({
        episodeNumber: nextUnwatchedEpisode.episodeNumber,
        seasonNumber: currentSeason.seasonNumber,
        seriesId: tvSeries!.id,
        sessionId: encryptedSessionId,
        userId: user.id,
        watchProvider,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return currentSeason ? (
    <InProgress
      currentSeason={currentSeason}
      currentSeasonWatchCount={watchCount}
      markNextAsWatched={markNextAsWatchedAction}
      removeAction={removeAction}
      removeIsAllowed={authenticatedUser?.id === user.id}
      tvSeries={tvSeries!}
    />
  ) : null;
}
