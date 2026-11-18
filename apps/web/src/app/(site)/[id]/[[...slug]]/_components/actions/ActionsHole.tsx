import type { TvSeries } from '@tvseri.es/schemas';

import { getViewer } from '@/auth/viewer';
import SeedSeries from '@/lib/marking/SeedSeries';

import { orFallback } from '../../_data/orFallback';
import { loadRemoteEpisodes } from '../../_data/remoteEpisodes';
import { getViewerSeed } from '../../_data/viewerSeed';
import ActionButtons from './ActionButtons';

/**
 * The hero's action buttons with the viewer's lists, seeded from the same
 * per-request seed as the progress line. Admins also get the Remote's Admin
 * row.
 */
export default async function ActionsHole({
  series,
}: Readonly<{
  series: Pick<
    TvSeries,
    | 'hasAired'
    | 'id'
    | 'nextEpisodeToAir'
    | 'seasons'
    | 'slug'
    | 'specials'
    | 'title'
  >;
}>) {
  const [{ seed }, viewer] = await Promise.all([
    getViewerSeed(series),
    getViewer(),
  ]);
  const isAdmin = viewer?.role === 'admin';
  const episodes = await orFallback(
    loadRemoteEpisodes(seed),
    [],
    'remote episodes',
  );
  const next = series.nextEpisodeToAir;
  const nextToAir = next
    ? {
        airDate: next.airDate ? next.airDate.slice(0, 10) : null,
        episodeNumber: next.episodeNumber,
        seasonNumber: next.seasonNumber,
      }
    : null;
  return (
    <>
      <SeedSeries seed={seed} />
      <ActionButtons
        episodes={episodes}
        hasAired={series.hasAired}
        isAdmin={isAdmin}
        nextToAir={nextToAir}
        seriesId={series.id}
        slug={series.slug}
        title={series.title}
      />
    </>
  );
}
