import type { TvSeries } from '@tvseri.es/schemas';

import { nextEpisode } from '@/lib/marking/progress';
import SeedSeries from '@/lib/marking/SeedSeries';
import { seedToBase } from '@/lib/marking/state';

import { loadWallEpisodes } from '../../_data/loaders';
import { getViewerSeed } from '../../_data/viewerSeed';
import EpisodesClient from './EpisodesClient';
import { defaultSeasonNumber, seasonFromQuery } from './panelRows';

export type ShowQuery = Promise<
  Readonly<Record<string, string | string[] | undefined>>
>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? null;

/**
 * The section's viewer hole (request time): seeds the marks, then renders
 * the wall on the season `?season` asks for, else the viewer's Next-up
 * season (its episodes from the cached loader), with their marks. Streamed
 * as HTML, it replaces the shell's signed-out wall before any JS runs, so
 * nothing switches after hydration. The hole already waits for the request,
 * so reading the query here keeps the shell static.
 */
export default async function ViewerWall({
  query,
  seasons,
  series,
  shellSeason,
}: Readonly<{
  query: ShowQuery;
  seasons: ReadonlyArray<Readonly<{ seasonNumber: number }>>;
  series: TvSeries;
  shellSeason: number;
}>) {
  const [{ seed, signedIn }, params] = await Promise.all([
    getViewerSeed(series),
    query,
  ]);
  const asked = seasonFromQuery(seasons, {
    history: params.history !== undefined,
    season: first(params.season),
  });
  const seasonNumber =
    asked ??
    (signedIn
      ? defaultSeasonNumber(seasons, nextEpisode(seedToBase(seed)))
      : null) ??
    shellSeason;
  const episodes = await loadWallEpisodes(series.id, seasonNumber);
  return (
    <>
      <SeedSeries seed={seed} />
      <div data-slot="episodes">
        <EpisodesClient
          defaultSeason={seasonNumber}
          initial={episodes}
          personal={signedIn}
          seriesId={series.id}
        />
      </div>
    </>
  );
}
