import type { TvSeries } from '@tvseri.es/schemas';
import { Suspense } from 'react';

import { loadWallEpisodes } from '../../_data/loaders';
import { toShowSummary } from '../../_lib/show';
import { EPISODES_SECTION } from '../frames';
import EpisodesShell from './EpisodesShell';
import EpisodesSkeleton from './EpisodesSkeleton';
import { defaultSeasonNumber } from './panelRows';
import SeasonParam from './SeasonParam';
import ViewerWall, { type ShowQuery } from './ViewerWall';

type WallProps = Readonly<{
  query: ShowQuery;
  seasons: ReadonlyArray<Readonly<{ seasonNumber: number }>>;
  series: TvSeries;
  shellSeason: number;
}>;

/**
 * The wall is the viewer hole: its fallback, in the static shell, is the
 * signed-out default season's wall from the cached loader; the hole streams
 * the viewer's season with their marks in its place.
 */
async function SeasonWall({ query, seasons, series, shellSeason }: WallProps) {
  const episodes = await loadWallEpisodes(series.id, shellSeason);
  const fallback = (
    <EpisodesShell
      initial={episodes}
      seasonNumber={shellSeason}
      seriesId={series.id}
    />
  );
  return (
    <Suspense fallback={fallback}>
      <ViewerWall
        query={query}
        seasons={seasons}
        series={series}
        shellSeason={shellSeason}
      />
    </Suspense>
  );
}

/**
 * The episodes section: season select
 * and facts, the season line and the Focus wall. The static shell draws the
 * signed-out default (the first season, Next up for nobody = its first
 * episode); the viewer's wall (`?season=N`, else their Next-up season,
 * with their marks) replaces it in the streamed HTML; the client then
 * follows the `?season` the page writes.
 */
export default function EpisodesSection({
  query,
  series,
}: Readonly<{
  /** The request's query: read only in the viewer's hole */
  query: ShowQuery;
  series: TvSeries;
}>) {
  const { seasons } = toShowSummary(series);
  const shellSeason = defaultSeasonNumber(seasons, null);
  if (shellSeason === null) {
    return null;
  }
  return (
    <section
      aria-label="Episodes"
      className={EPISODES_SECTION}
      data-slot="episodes-section"
    >
      <Suspense fallback={<EpisodesSkeleton />}>
        <SeasonWall
          query={query}
          seasons={seasons}
          series={series}
          shellSeason={shellSeason}
        />
      </Suspense>
      <Suspense fallback={null}>
        <SeasonParam />
      </Suspense>
    </section>
  );
}
