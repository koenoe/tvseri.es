'use client';

import type { Episode, WatchedItem, WatchProvider } from '@tvseri.es/schemas';
import Image from 'next/image';
import { memo } from 'react';

import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';
import Datepicker from '../Datepicker/DatepickerLazy';
import type { WatchedAction } from './Cards';

function EpisodeCard({
  episode,
  watchProvider,
  watchedItem,
  updateItems,
}: Readonly<{
  episode: Episode;
  watchProvider?: WatchProvider | null;
  watchedItem?: Partial<WatchedItem> | null;
  updateItems: (action: WatchedAction) => void;
}>) {
  const watchProviderLogoImage =
    watchedItem?.watchProviderLogoImage || watchProvider?.logo;
  const watchProviderLogoPath =
    watchedItem?.watchProviderLogoPath || watchProvider?.logoPath;
  const watchProviderName =
    watchedItem?.watchProviderName || watchProvider?.name;

  return (
    <div className="relative flex flex-col gap-4 rounded-lg bg-black/10 p-4 md:flex-row md:items-center">
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
          {episode.runtime && <div>{formatDate(episode.airDate)}</div>}
          <div className="opacity-60 before:mr-1 before:content-['—']">
            {formatRuntime(episode.runtime)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 md:ml-auto">
        <Datepicker
          className="flex h-8 w-full cursor-pointer items-center gap-1 text-nowrap rounded-md border border-white/10 bg-black/10 px-2 text-center text-xs text-white/75 md:w-auto"
          footer={
            <div className="mt-4 flex gap-3">
              <button
                className="flex w-1/2 items-center justify-center text-nowrap rounded-lg bg-white/5 p-3 text-xs tracking-wide hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  updateItems({
                    items: [
                      {
                        episodeNumber: episode.episodeNumber,
                        episodeStillPath: episode.stillPath,
                        episodeTitle: episode.title,
                        runtime: episode.runtime,
                        seasonNumber: episode.seasonNumber,
                        watchedAt: Date.now(),
                        watchProviderLogoImage,
                        watchProviderLogoPath,
                        watchProviderName,
                      },
                    ],
                    type: 'update',
                  });
                }}
              >
                Just finished
              </button>
              <button
                className="flex w-1/2 items-center justify-center text-nowrap rounded-lg bg-white/5 p-3 text-xs tracking-wide hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  updateItems({
                    items: [
                      {
                        episodeNumber: episode.episodeNumber,
                        episodeStillPath: episode.stillPath,
                        episodeTitle: episode.title,
                        runtime: episode.runtime,
                        seasonNumber: episode.seasonNumber,
                        watchedAt: new Date(episode.airDate).getTime(),
                        watchProviderLogoImage,
                        watchProviderLogoPath,
                        watchProviderName,
                      },
                    ],
                    type: 'update',
                  });
                }}
              >
                Release date
              </button>
            </div>
          }
          offset={{
            x: 0,
            y: 30,
          }}
          onClick={(e) => e.stopPropagation()}
          onSelect={(value) => {
            updateItems({
              items: [
                {
                  episodeNumber: episode.episodeNumber,
                  episodeStillPath: episode.stillPath,
                  episodeTitle: episode.title,
                  runtime: episode.runtime,
                  seasonNumber: episode.seasonNumber,
                  watchedAt: new Date(value).getTime(),
                  watchProviderLogoImage,
                  watchProviderLogoPath,
                  watchProviderName,
                },
              ],
              type: 'update',
            });
          }}
          selected={watchedItem ? new Date(watchedItem.watchedAt!) : undefined}
        >
          {watchedItem ? (
            <>
              <span>Watched on</span>
              <span className="font-semibold">
                {formatDate(new Date(watchedItem.watchedAt!).toISOString())}
              </span>
              <svg
                className="ml-auto size-4 md:ml-0.5"
                fill="currentColor"
                onClick={(e) => {
                  e.stopPropagation();

                  updateItems({
                    items: [watchedItem],
                    type: 'delete',
                  });
                }}
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7.004 23.087l7.08-7.081-7.07-7.071L8.929 7.02l7.067 7.069L23.084 7l1.912 1.913-7.089 7.093 7.075 7.077-1.912 1.913-7.074-7.073L8.917 25z" />
              </svg>
            </>
          ) : (
            <>
              <span>Select watch date</span>
              <svg
                className="ml-auto size-4 md:ml-0.5"
                fill="none"
                viewBox="0 0 15 15"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
            </>
          )}
        </Datepicker>
        {watchProviderLogoImage && watchProviderName && (
          <Image
            alt={watchProviderName}
            className="absolute right-4 top-4 rounded md:relative md:right-auto md:top-auto"
            height={28}
            src={watchProviderLogoImage}
            unoptimized
            width={28}
          />
        )}
      </div>
    </div>
  );
}

export default memo(EpisodeCard);
