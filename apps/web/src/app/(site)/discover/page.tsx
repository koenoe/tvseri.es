import type { Metadata } from 'next';
import { Suspense } from 'react';

import Page from '@/components/background/Page';
import RowErrorBoundary from '@/components/ui/row/RowErrorBoundary';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import AllTimeFavourites from './_components/AllTimeFavourites';
import Essentials, {
  ESSENTIALS_ID,
  EssentialsTitleGhost,
} from './_components/Essentials';
import Genres from './_components/Genres';
import GoDeeper, { GO_DEEPER_ID } from './_components/GoDeeper';
import { GenresSkeleton, GoDeeperCardGhost } from './_components/HubSkeletons';
import HubTitle from './_components/HubTitle';
import Lenses from './_components/lens/Lenses';
import { LensProvider } from './_components/lens/LensProvider';
import SectionHeader from './_components/SectionHeader';
import Weekend, {
  WEEKEND_ID,
  WEEKEND_TITLE,
  WeekendSkeleton,
} from './_components/Weekend';

export const metadata: Metadata = {
  description:
    'Browse TV by how long it is, when it was made, where it’s from, its language, its network and its themes.',
  title: 'Discover',
};

/**
 * The Discover hub: the same page for
 * every visitor, cached whole. The viewer's parts load on the client: the
 * region line (`/api/region`) and the Watched labels. Each section streams
 * on its own and fails on its own.
 */
export default function DiscoverPage() {
  // Finish it this weekend isn't a tile row: it streams in with, and fails over, its own placeholder
  const weekend = <WeekendSkeleton />;
  return (
    <Page>
      <LensProvider>
        <div
          className="flex flex-col gap-12 pt-2.5 md:gap-16 md:pt-9"
          data-testid="route-discover"
        >
          <div className="flex flex-col gap-12 md:gap-10">
            <HubTitle />
            <Lenses />
          </div>
          <RowErrorBoundary
            caption="hub"
            id={ESSENTIALS_ID}
            look="hubPoster"
            title="Essentials"
          >
            <Suspense
              fallback={
                <RowSkeleton
                  caption="hub"
                  id={ESSENTIALS_ID}
                  look="hubPoster"
                  name={ESSENTIALS_ID}
                  title="Essentials"
                  titleContent={<EssentialsTitleGhost />}
                />
              }
            >
              <Essentials />
            </Suspense>
          </RowErrorBoundary>
          <RowErrorBoundary id={GO_DEEPER_ID} look="hub" title="Go deeper">
            <Suspense
              fallback={
                <RowSkeleton
                  id={GO_DEEPER_ID}
                  look="hub"
                  name={GO_DEEPER_ID}
                  tileGhost={<GoDeeperCardGhost />}
                  tiles="card"
                  title="Go deeper"
                />
              }
            >
              <GoDeeper />
            </Suspense>
          </RowErrorBoundary>
          {/* Phones go from Go deeper to All-time favourites */}
          <div className="max-md:hidden">
            <RowErrorBoundary
              id={WEEKEND_ID}
              placeholder={weekend}
              title={WEEKEND_TITLE}
            >
              <Suspense fallback={weekend}>
                <Weekend />
              </Suspense>
            </RowErrorBoundary>
          </div>
          <AllTimeFavourites />
          <section
            aria-labelledby="genres-title"
            className="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter"
          >
            <SectionHeader id="genres-title" title="Genres" />
            <Suspense fallback={<GenresSkeleton />}>
              <Genres />
            </Suspense>
          </section>
        </div>
      </LensProvider>
    </Page>
  );
}
