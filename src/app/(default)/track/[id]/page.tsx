import { Suspense } from 'react';

import { notFound, unauthorized } from 'next/navigation';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import InfoLine from '@/components/InfoLine/InfoLine';
import Poster from '@/components/Tiles/Poster';
import EpisodesContainer from '@/components/Track/EpisodesContainer';
import formatDate from '@/utils/formatDate';

type Props = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function TrackPage({ params: paramsFromProps }: Props) {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  const params = await paramsFromProps;
  const tvSeries = await cachedTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return notFound();
  }

  return (
    <>
      <div className="flex gap-10">
        <Poster
          item={tvSeries}
          size="small"
          className="hidden flex-shrink-0 md:block"
        />
        <div className="relative w-full">
          <h1 className="mb-2 text-lg font-medium lg:text-xl">
            {tvSeries.title}
          </h1>
          <InfoLine tvSeries={tvSeries} />
          <ExpandableText className="mt-4 hidden w-full max-w-4xl text-sm md:block">
            {tvSeries.description}
          </ExpandableText>
          <div className="mt-4 flex flex-col gap-2 md:flex-row">
            <div className="flex h-11 w-full cursor-default items-center justify-center gap-2 rounded-3xl bg-white/5 px-3 text-[0.65rem] leading-none tracking-wide hover:bg-white/10 md:w-auto md:px-5 md:text-xs">
              <svg
                className="size-4"
                fill="currentColor"
                viewBox="0 0 512 512"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="256" cy="256" r="64" />
                <path d="M394.82,141.18C351.1,111.2,304.31,96,255.76,96c-43.69,0-86.28,13-126.59,38.48C88.52,160.23,48.67,207,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416c49,0,95.85-15.07,139.3-44.79C433.31,345,469.71,299.82,496,256,469.62,212.57,433.1,167.44,394.82,141.18ZM256,352a96,96,0,1,1,96-96A96.11,96.11,0,0,1,256,352Z" />
              </svg>
              <div className="flex items-center gap-1 text-nowrap md:gap-2">
                <span>Watched on</span>
                <button className="cursor-pointer text-nowrap rounded-lg border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-center text-[0.65rem] text-neutral-400 md:text-xs">
                  {formatDate(Date.now())}
                </button>
                <span>or</span>
                <button className="cursor-pointer text-nowrap rounded-lg border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-center text-[0.65rem] text-neutral-400 md:text-xs">
                  release date
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10">
        <Suspense fallback="Loading...">
          <EpisodesContainer tvSeries={tvSeries} user={user} />
        </Suspense>
      </div>
    </>
  );
}
