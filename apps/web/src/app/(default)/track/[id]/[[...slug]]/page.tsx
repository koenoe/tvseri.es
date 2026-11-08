import { notFound, permanentRedirect, unauthorized } from 'next/navigation';
import { Suspense } from 'react';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import ActionButtons from '@/components/Buttons/ActionButtons';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import InfoLine from '@/components/InfoLine/InfoLine';
import Page from '@/components/Page/Page';
import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';
import Poster from '@/components/Tiles/Poster';
import CardsContainer from '@/components/Track/CardsContainer';
import canonicalPath from '@/utils/canonicalPath';
import toCanonicalId from '@/utils/toCanonicalId';
import { toPosterItem } from '@/utils/toPosterItem';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

export default async function TrackPage({ params: paramsFromProps }: Props) {
  // Session and params resolve in parallel, and the (cached) series fetch
  // starts before the session check, so neither waits on the other.
  const authPromise = auth();
  const params = await paramsFromProps;
  const id = toCanonicalId(params.id);
  // Same options as /tv, so both read one warm cache entry
  const tvSeriesPromise = id
    ? cachedTvSeries(id, { includeImages: true })
    : Promise.resolve(null);
  // Not awaited when unauthorized: don't surface a rejection as unhandled
  tvSeriesPromise.catch(() => null);

  const { user } = await authPromise;

  if (!user) {
    return unauthorized();
  }

  if (!id) {
    return notFound();
  }

  const tvSeries = await tvSeriesPromise;

  if (!tvSeries || tvSeries.isAdult) {
    return notFound();
  }

  // One redirect for both a non-canonical id (leading zeros) and a stale slug
  const redirectPath = canonicalPath({
    id,
    params,
    segment: 'track',
    slug: tvSeries.slug,
  });

  if (redirectPath) {
    return permanentRedirect(redirectPath);
  }

  const posterItem = toPosterItem(tvSeries);

  return (
    <Page backgroundContext="dots">
      <div className="container">
        <div className="flex gap-6 md:gap-10">
          <Poster
            className="flex-shrink-0 w-[75px] h-[113px]"
            item={posterItem}
            size="small"
          />
          <div className="relative w-full">
            <h1 className="mb-2 text-lg font-medium lg:text-xl">
              {tvSeries.title}
            </h1>
            <InfoLine tvSeries={tvSeries} />
            <ExpandableText className="mt-4 hidden w-full max-w-4xl text-sm md:block">
              {tvSeries.description}
            </ExpandableText>
            <div className="mt-4 flex gap-3">
              <Suspense
                fallback={
                  <>
                    <SkeletonCircleButton />
                    <SkeletonCircleButton />
                  </>
                }
              >
                <ActionButtons
                  showContextMenuButton={false}
                  showWatchButton={false}
                  tvSeries={tvSeries}
                />
              </Suspense>
            </div>
          </div>
        </div>
        <div className="mt-10 bg-neutral-900">
          <Suspense
            fallback={
              <div className="flex animate-pulse flex-col gap-4">
                {Array.from({ length: tvSeries.numberOfSeasons }).map(
                  (_, i) => (
                    <div
                      className="flex h-[7.5rem] flex-col gap-3 rounded-lg bg-white/5 p-6 md:h-[5.25rem] md:flex-row md:items-center"
                      key={i}
                    >
                      <div className="h-6 w-32 bg-white/15" />
                      <div className="h-8 w-full rounded bg-white/5 md:ml-auto md:w-48" />
                    </div>
                  ),
                )}
              </div>
            }
          >
            <CardsContainer tvSeries={tvSeries} user={user} />
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
