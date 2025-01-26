'use client';

import { memo, useCallback, useTransition } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { type WatchedItem } from '@/lib/db/watched';
import { type Season } from '@/types/tv-series';
import { type WatchProvider } from '@/types/watch-provider';
import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';

import Datepicker from '../Datepicker/Datepicker';
import LoadingDots from '../LoadingDots/LoadingDots';

function TrackForm({
  seasons,
  watched,
  watchProvider,
  saveAction,
  deleteAction,
}: Readonly<{
  seasons: Season[];
  watched: WatchedItem[];
  watchProvider?: WatchProvider | null;
  saveAction: (items: Partial<WatchedItem>[]) => void;
  deleteAction: (items: Partial<WatchedItem>[]) => void;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        // await saveAction();
        router.refresh();
      } catch (_) {
        toast.error('Something went wrong. Please try again later.');
      }
    });
  }, [router]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {seasons.map((season) => (
          <div key={season.id} className="rounded-lg bg-white/5 p-6">
            <div className="mb-4 flex items-center">
              <h2 className="text-lg font-medium">{season.title}</h2>
              <div className="ml-auto flex items-center gap-4">
                <Datepicker
                  className="flex h-9 cursor-pointer items-center gap-1 text-nowrap rounded-md border border-white/10 bg-black/20 px-2.5 text-center text-sm text-white/60"
                  offset={{
                    x: 0,
                    y: 30,
                  }}
                  onSelect={(value) => console.log({ value })}
                >
                  {/* {formatDate(new Date().toISOString())} */}
                  <span>Finished on</span>
                  <span className="font-semibold">
                    {formatDate(new Date().toISOString())}
                  </span>
                </Datepicker>
                <svg className="size-6" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {season.episodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center rounded-lg bg-black/25 p-4"
                >
                  <div>
                    <div className="flex gap-3">
                      <span className="flex h-6 w-14 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-center text-xs font-medium">
                        {formatSeasonAndEpisode({
                          seasonNumber: episode.seasonNumber,
                          episodeNumber: episode.episodeNumber,
                        })}
                      </span>
                      {episode.title}
                    </div>
                    <div className="mt-3 flex w-full gap-1.5 text-xs font-medium">
                      {episode.runtime && (
                        <div>{formatDate(episode.airDate)}</div>
                      )}
                      <div className="opacity-60 before:mr-1 before:content-['—']">
                        {formatRuntime(episode.runtime)}
                      </div>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <Datepicker
                      className="h-8 cursor-pointer text-nowrap rounded-md border border-white/5 bg-black/5 px-2 text-center text-xs text-white/50"
                      offset={{
                        x: 0,
                        y: 30,
                      }}
                      onSelect={(value) => console.log({ value })}
                    >
                      Watched on{' '}
                      <span className="font-semibold">
                        {formatDate(new Date().toISOString())}
                      </span>
                      {/* Mark as watched */}
                    </Datepicker>
                    <Image
                      className="rounded"
                      src={watchProvider?.logo || ''}
                      alt={watchProvider?.name || ''}
                      width={28}
                      height={28}
                      unoptimized
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex w-full flex-col items-center gap-4 md:mt-10 md:flex-row">
        <button
          onClick={() => router.back()}
          className="flex h-11 w-full min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white/5 px-5 text-sm leading-none tracking-wide hover:bg-white/10 md:ml-auto md:w-auto"
        >
          <span>Back</span>
        </button>

        <button
          onClick={handleSave}
          className={twMerge(
            'flex h-11 w-full min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white px-5 text-sm leading-none tracking-wide text-neutral-900 md:w-auto',
            // disableSaveButton && 'cursor-not-allowed opacity-40',
          )}
          disabled={isPending}
        >
          {isPending ? (
            <LoadingDots className="h-2 text-neutral-900" />
          ) : (
            'Save'
          )}
        </button>
      </div>
    </>
  );
}

export default memo(TrackForm);
