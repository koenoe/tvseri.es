'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import {
  memo,
  useCallback,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';
import { getActionErrorMessage } from '@/app/actionResult';
import { removeFromInProgress } from '@/app/watchActions';
import { CrossIcon } from '@/components/Icons/CrossIcon';
import { EyeSolidIcon } from '@/components/Icons/EyeSolidIcon';
import useRgbString from '@/hooks/useRgbString';
import type { SpotlightTvSeries } from '@/utils/toSpotlightTvSeries';
import ContextMenuButton, {
  type ContextMenuButtonHandle,
} from '../Buttons/ContextMenuButton';
import { ContextMenuItem, ContextMenuLink } from '../Buttons/ContextMenuItem';
import MarkNextEpisodeMenuItem from '../Buttons/MarkNextEpisodeMenuItem';
import Progress from '../Progress/Progress';
import SpotlightBackground from '../Spotlight/SpotlightBackground';
import SpotlightShowMeta from '../Spotlight/SpotlightShowMeta';
import SpotlightTitle from '../Spotlight/SpotlightTitle';
import type { WatchedStoreSeason } from '../Watched/toWatchedStoreTvSeries';
import useInProgressSeason from './useInProgressSeason';

function InProgress({
  currentSeason: serverCurrentSeason,
  currentSeasonWatchCount,
  tvSeries,
  removeIsAllowed = false,
}: Readonly<{
  currentSeason: WatchedStoreSeason;
  currentSeasonWatchCount: number;
  tvSeries: SpotlightTvSeries;
  removeIsAllowed?: boolean;
}>) {
  const { currentSeason, watchCount } = useInProgressSeason(
    tvSeries.id,
    { currentSeason: serverCurrentSeason, watchCount: currentSeasonWatchCount },
    removeIsAllowed,
  );
  const contextMenuButtonRef = useRef<ContextMenuButtonHandle>(null);
  const backdropColorRgbString = useRgbString(tvSeries.backdropColor);
  const [isRemoved, setIsRemoved] = useState(false);
  const [optimisticIsRemoved, setIsOptimisticRemoved] = useOptimistic(
    isRemoved,
    (_, optimisticValue: boolean) => optimisticValue,
  );
  const [isRemoving, startRemove] = useTransition();

  const handleRemove = useCallback(() => {
    contextMenuButtonRef.current?.close();

    startRemove(async () => {
      setIsOptimisticRemoved(true);
      const result = await removeFromInProgress(tvSeries.id).catch(() => null);
      if (result?.ok) {
        setIsRemoved(true);
        return;
      }
      toast.error(
        getActionErrorMessage(
          result?.error ?? 'failed',
          `Failed to remove item from 'In Progress'`,
        ),
      );
    });
  }, [setIsOptimisticRemoved, tvSeries.id]);

  const trackHref = `/track/${tvSeries.id}/${tvSeries.slug}?season=${currentSeason.seasonNumber}`;

  const handleCloseMenu = useCallback(() => {
    contextMenuButtonRef.current?.close();
  }, []);

  return (
    <AnimatePresence initial={false}>
      {!optimisticIsRemoved && (
        <motion.div
          className="relative origin-top-right overflow-hidden rounded-xl shadow-lg after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-['']"
          exit={{
            opacity: 0,
            scale: 0,
          }}
          initial={{ opacity: 1, scale: 1 }}
          key={`link-${tvSeries.id}`}
        >
          <Link
            className="relative z-10 flex aspect-[16/21] flex-shrink-0 items-end md:aspect-[16/14] lg:aspect-[16/8] xl:aspect-[16/15] 2xl:aspect-[16/12]"
            href={{
              pathname: `/tv/${tvSeries.id}/${tvSeries.slug}`,
              query: { season: currentSeason.seasonNumber },
            }}
          >
            {tvSeries.backdropImage ? (
              <SpotlightBackground
                item={tvSeries}
                sizes="(min-width: 1280px) 50vw, 100vw"
              />
            ) : null}

            <div className="flex w-full flex-col gap-5 p-6 md:gap-6 md:p-9">
              <SpotlightTitle item={tvSeries} size="small" />

              <SpotlightShowMeta item={tvSeries} />
              <div className="relative flex cursor-default items-center gap-3 rounded-xl p-4 shadow-glass backdrop-blur md:flex-row md:items-center md:gap-10 md:p-6">
                <h2 className="flex-nowrap text-ellipsis text-nowrap text-sm font-medium md:w-auto md:text-lg">
                  <span className="hidden sm:inline-block">
                    {currentSeason.title}
                  </span>
                  <span className="sm:hidden">
                    S{currentSeason.seasonNumber.toString().padStart(2, '0')}
                  </span>
                </h2>
                <Progress
                  className="h-7"
                  numberOfEpisodes={
                    currentSeason.numberOfAiredEpisodes ||
                    currentSeason.numberOfEpisodes ||
                    0
                  }
                  numberOfWatched={watchCount}
                />
              </div>
            </div>
            {removeIsAllowed ? (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(225deg, rgba(${backdropColorRgbString}, 1) 0%, rgba(${backdropColorRgbString}, 0) 30%)`,
                }}
              />
            ) : null}
          </Link>
          {removeIsAllowed ? (
            <ContextMenuButton
              className="!absolute !right-4 !top-4 !z-20"
              ref={contextMenuButtonRef}
              size="small"
            >
              <MarkNextEpisodeMenuItem
                onSelect={handleCloseMenu}
                tvSeriesId={tvSeries.id}
              />
              <ContextMenuLink href={trackHref} onClick={handleCloseMenu}>
                <EyeSolidIcon className="size-5" />
                <span>Edit watch history</span>
              </ContextMenuLink>
              <ContextMenuItem disabled={isRemoving} onClick={handleRemove}>
                <CrossIcon className="size-5" />
                <span>Hide from in progress</span>
              </ContextMenuItem>
            </ContextMenuButton>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

InProgress.displayName = 'InProgress';

export default memo(InProgress);
