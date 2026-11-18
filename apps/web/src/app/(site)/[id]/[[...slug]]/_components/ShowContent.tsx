import type { TvSeries } from '@tvseri.es/schemas';
import { Suspense } from 'react';

import Page from '@/components/background/Page';

import ShowProvider from '../_lib/ShowProvider';
import { toShowSummary } from '../_lib/show';
import AdminHole from './admin/AdminHole';
import Cast, { CastSkeleton } from './cast/Cast';
import CreatedBy from './cast/CreatedBy';
import EpisodeModalIsland from './episode-modal/EpisodeModalIsland';
import EpisodesSection from './episodes/EpisodesSection';
import type { ShowQuery } from './episodes/ViewerWall';
import { CAST_FRAME, RECOMMENDATIONS_FRAME } from './frames';
import Hero from './hero/Hero';
import HistorySheetIsland from './history/HistorySheetIsland';
import Storyline from './info/Storyline';
import PickerHost from './picker/PickerHost';
import UpToHost from './picker/UpToHost';
import Recommendations from './recommendations/Recommendations';

/**
 * The show page: hero, "Created by" and cast, the episodes section,
 * recommendations, then Storyline and
 * Information on the darker band. The page colour and backdrop come from
 * `Page` (first frame on a hard load, restored on Back). The shell never seeds
 * the marking store: the viewer's seed (seasons, marks, status) arrives in
 * the holes that read it, so a signed-out shell seed can never replace it.
 */
export default function ShowContent({
  query,
  series,
}: Readonly<{
  /** The request's query: read only in the episodes' viewer hole */
  query: ShowQuery;
  series: TvSeries;
}>) {
  const show = toShowSummary(series);
  return (
    <ShowProvider show={show}>
      <Page
        animateBackground
        backgroundClassName="max-md:hidden"
        backgroundColor={series.backdropColor}
        backgroundImage={series.backdropImage}
        backgroundPriority
      >
        <div data-slot="show" data-testid="route-show">
          <Hero series={series} />
          <div className={CAST_FRAME} data-slot="cast-block">
            <CreatedBy creators={series.createdBy} />
            <Suspense fallback={<CastSkeleton />}>
              <Cast seriesId={series.id} />
            </Suspense>
          </div>
          <EpisodesSection query={query} series={series} />
          <div className={RECOMMENDATIONS_FRAME} data-slot="recommendations">
            <Recommendations seriesId={series.id} />
          </div>
          <Storyline series={series} />
        </div>
        {/* Admins only; inside Page: the tray drives the page colour. */}
        <Suspense fallback={null}>
          <AdminHole series={series} />
        </Suspense>
      </Page>
      {/* Overlays: client islands that read the URL (`_lib/urlState.ts`). */}
      <Suspense fallback={null}>
        <HistorySheetIsland />
        <EpisodeModalIsland />
      </Suspense>
      <PickerHost />
      <UpToHost />
    </ShowProvider>
  );
}
