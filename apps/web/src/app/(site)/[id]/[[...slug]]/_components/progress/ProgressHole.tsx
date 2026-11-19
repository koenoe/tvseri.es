import type { TvSeries } from '@tvseri.es/schemas';

import { isUnavailable } from '@/lib/cache/unavailable';
import SeedSeries from '@/lib/marking/SeedSeries';

import { loadRuntimes } from '@/lib/series/loaders';
import { getViewerSeed } from '../../_data/viewerSeed';
import ProgressBar from './ProgressBar';
import { NO_RUNTIMES, nextAirDateOf } from './progressLine';

/**
 * The viewer's progress line: seeds the marking store with their marks
 * (signed out: the seasons only), then the line, for everyone in the same
 * place (signed out: the series' size, and a click asks to sign in). A
 * Suspense hole (reads the session).
 */
export default async function ProgressHole({
  series,
}: Readonly<{
  series: Pick<TvSeries, 'id' | 'nextEpisodeToAir' | 'seasons' | 'specials'>;
}>) {
  const [{ seed, signedIn }, runtimes] = await Promise.all([
    getViewerSeed(series),
    loadRuntimes(series.id),
  ]);
  const nextAirDate = nextAirDateOf(series);
  const knownRuntimes = isUnavailable(runtimes) ? NO_RUNTIMES : runtimes;
  return (
    <>
      <SeedSeries seed={seed} />
      <ProgressBar
        nextAirDate={nextAirDate}
        runtimes={knownRuntimes}
        seriesId={series.id}
        signedIn={signedIn}
      />
    </>
  );
}
