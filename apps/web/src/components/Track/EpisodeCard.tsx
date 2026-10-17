'use client';

import type { Episode, WatchProvider } from '@tvseri.es/schemas';
import Image from 'next/image';
import { memo, useCallback, useMemo } from 'react';

import { formatDateOnly } from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';
import ImageWithFallback from '../Image/ImageWithFallback';
import StillPlaceholder from '../Image/StillPlaceholder';
import toTrackedEpisode from './toTrackedEpisode';
import type { TrackedEpisode, WatchedAction, WatchedAtChoice } from './types';
import WatchDatePicker from './WatchDatePicker';

const renderStillPlaceholder = () => (
  <StillPlaceholder className="h-full w-full" />
);

function EpisodeCard({
  episode,
  watchProvider,
  watchedItem,
  updateItems,
}: Readonly<{
  episode: Episode;
  watchProvider?: WatchProvider | null;
  watchedItem?: TrackedEpisode;
  updateItems: (action: WatchedAction) => void;
}>) {
  const watchProviderLogoImage =
    watchedItem?.watchProviderLogoImage || watchProvider?.logo;
  const watchProviderLogoPath =
    watchedItem?.watchProviderLogoPath || watchProvider?.logoPath;
  const watchProviderName =
    watchedItem?.watchProviderName || watchProvider?.name;

  const watchProviderFields = useMemo(
    () => ({
      watchProviderLogoImage,
      watchProviderLogoPath,
      watchProviderName,
    }),
    [watchProviderLogoImage, watchProviderLogoPath, watchProviderName],
  );

  const handleChange = useCallback(
    (watchedAt: WatchedAtChoice) => {
      updateItems({
        items: [toTrackedEpisode(episode, watchedAt, watchProviderFields)],
        type: 'update',
      });
    },
    [episode, updateItems, watchProviderFields],
  );

  const handleDelete = useCallback(() => {
    if (!watchedItem) {
      return;
    }
    updateItems({
      items: [watchedItem],
      type: 'delete',
    });
  }, [updateItems, watchedItem]);

  return (
    <div className="relative flex flex-col gap-4 rounded-xl bg-black/10 p-4 md:flex-row md:items-center">
      <div className="relative hidden aspect-video overflow-clip rounded-lg md:block md:w-28 after:absolute after:inset-0 after:rounded-lg after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-['']">
        {episode.stillImage ? (
          <ImageWithFallback
            alt=""
            className="aspect-video h-full w-full object-cover"
            draggable={false}
            fallback={renderStillPlaceholder}
            height={63}
            placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(112, 63)}`}
            src={episode.stillImage}
            unoptimized
            width={112}
          />
        ) : (
          <StillPlaceholder className="h-full w-full" />
        )}
      </div>
      <div>
        <div className="flex flex-nowrap gap-3">
          <span className="flex h-6 w-14 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-center text-xs font-medium">
            {formatSeasonAndEpisode({
              episodeNumber: episode.episodeNumber,
              seasonNumber: episode.seasonNumber,
            })}
          </span>
          <span className="w-[calc(100%-6.5rem)] truncate md:w-full">
            {episode.title}
          </span>
        </div>
        <div className="mt-3 flex w-full gap-1.5 text-xs font-medium">
          {episode.airDate ? (
            <div>{formatDateOnly(episode.airDate)}</div>
          ) : null}
          <div className="opacity-60 before:mr-1 before:content-['—']">
            {formatRuntime(episode.runtime)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 md:ml-auto">
        <WatchDatePicker
          label="Watched on"
          onChange={handleChange}
          onDelete={handleDelete}
          size="small"
          watchedAt={watchedItem?.watchedAt}
        />
        {watchProviderLogoImage && watchProviderName ? (
          <Image
            alt={watchProviderName}
            className="absolute right-4 top-4 rounded md:relative md:right-auto md:top-auto"
            height={28}
            src={watchProviderLogoImage}
            unoptimized
            width={28}
          />
        ) : null}
      </div>
    </div>
  );
}

EpisodeCard.displayName = 'EpisodeCard';

export default memo(EpisodeCard);
