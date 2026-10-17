'use client';

import type { Season, WatchProvider } from '@tvseri.es/schemas';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';

import EpisodeCard from './EpisodeCard';
import toTrackedEpisode from './toTrackedEpisode';
import type { TrackedEpisode, WatchedAction, WatchedAtChoice } from './types';
import WatchDatePicker from './WatchDatePicker';

function SeasonCard({
  expandedSeasonNumber,
  season,
  watchProvider,
  watchedItems,
  updateItems,
}: Readonly<{
  expandedSeasonNumber: number | null;
  season: Season;
  watchProvider?: WatchProvider | null;
  watchedItems: TrackedEpisode[];
  updateItems: (action: WatchedAction) => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(
    expandedSeasonNumber === season.seasonNumber,
  );
  const watchedForSeason = useMemo(
    () =>
      watchedItems
        .filter((item) => item.seasonNumber === season.seasonNumber)
        .sort((a, b) => a.watchedAt - b.watchedAt),
    [season.seasonNumber, watchedItems],
  );
  const lastWatched = watchedForSeason[watchedForSeason.length - 1];
  const numberOfAiredEpisodes = season.numberOfAiredEpisodes ?? 0;
  const isFinished =
    numberOfAiredEpisodes > 0 &&
    watchedForSeason.length >= numberOfAiredEpisodes;
  const lastWatchedLabel = `${isFinished ? 'Finished' : 'Last watched'} on`;
  const episodes = useMemo(
    () => season.episodes.filter((episode) => episode.hasAired),
    [season.episodes],
  );
  const episodeRows = useMemo(() => {
    const watchedByEpisode = new Map(
      watchedForSeason.map((item) => [item.episodeNumber, item]),
    );
    return episodes.map((episode) => ({
      episode,
      watchedItem: watchedByEpisode.get(episode.episodeNumber),
    }));
  }, [episodes, watchedForSeason]);

  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const fromWithin =
        ref.current?.contains(event.target as Node) &&
        event.target !== ref.current;
      if (fromWithin) {
        setIsExpanded((prev) => !prev);
      }
    },
    [],
  );

  const handleChange = useCallback(
    (watchedAt: WatchedAtChoice, isJustFinished?: boolean) => {
      // "Just finished" only marks episodes that aren't watched yet (keeping
      // earlier dates); other choices re-date every aired episode.
      const targets = isJustFinished
        ? episodeRows
            .filter(({ watchedItem }) => !watchedItem)
            .map(({ episode }) => episode)
        : episodes;

      if (targets.length === 0) {
        return;
      }

      updateItems({
        items: targets.map((episode) => toTrackedEpisode(episode, watchedAt)),
        type: 'update',
      });
    },
    [episodeRows, episodes, updateItems],
  );

  const handleDelete = useCallback(() => {
    updateItems({
      items: watchedForSeason,
      type: 'delete',
    });
  }, [updateItems, watchedForSeason]);

  return (
    <div className="rounded-xl bg-neutral-800 p-6">
      <div
        className="relative w-full cursor-pointer"
        onClick={handleContainerClick}
        ref={ref}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <h2 className="w-full text-lg font-medium">{season.title}</h2>
          <div className="flex items-center gap-4 md:ml-auto">
            <WatchDatePicker
              label={lastWatchedLabel}
              onChange={handleChange}
              onDelete={handleDelete}
              watchedAt={lastWatched?.watchedAt}
            />
            <motion.svg
              animate={{
                rotate: isExpanded ? 180 : 0,
              }}
              className="absolute right-0 top-0 size-6 md:relative md:right-auto md:top-auto"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                clipRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                fillRule="evenodd"
              />
            </motion.svg>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            animate="open"
            exit="collapsed"
            initial="collapsed"
            key={season.id}
            transition={{ duration: 0.6, ease: [0.04, 0.62, 0.23, 0.98] }}
            variants={{
              collapsed: { height: 0, opacity: 0, scale: 0.96 },
              open: { height: 'auto', opacity: 1, scale: 1 },
            }}
          >
            <div className="flex flex-col gap-2 pt-6">
              {episodeRows.map(({ episode, watchedItem }) => (
                <EpisodeCard
                  episode={episode}
                  key={episode.id}
                  updateItems={updateItems}
                  watchedItem={watchedItem}
                  watchProvider={watchProvider}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

SeasonCard.displayName = 'SeasonCard';

export default memo(SeasonCard);
