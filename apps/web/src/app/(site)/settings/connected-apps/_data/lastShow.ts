import 'server-only';

import { loadSeriesOrNull } from '@/lib/series/loaders';

import type { LastShow } from '../_components/LastScrobble';

/**
 * The show behind an app card's latest mark (Plex's last scrobble, Netflix's
 * last synced episode): public, cached; a miss just drops the backdrop.
 */
export async function loadLastShow(
  seriesId: number,
  title: string,
): Promise<LastShow> {
  const series = await loadSeriesOrNull(seriesId);
  return {
    backdrop: series?.backdropImage ?? null,
    logo: series?.titleTreatmentImage ?? null,
    title: series?.title ?? title,
  };
}
