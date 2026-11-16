import { toSeasonRatingsView } from '@/app/(site)/[id]/[[...slug]]/_components/episode-modal/episodeRatings';
import { failedJson, notFoundJson, publicJson } from '@/app/api/cacheHeaders';
import { isSeriesId } from '@/app/api/handlers';
import { isEmptyRatings, loadSeasonRatings } from '@/lib/series/loaders';

/** The API takes seasons 0 to 99. */
const SEASON = /^\d{1,2}$/;

/**
 * A season's IMDb ratings by episode, for the episode modal (the only place
 * they show): public, CDN-cached like the API's `medium` profile. An empty
 * answer may be OMDb being unavailable, so it is never stored (`no-store`).
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<{ id: string; season: string }> }>,
) {
  const { id, season } = await params;
  if (!isSeriesId(id) || !SEASON.test(season)) {
    return notFoundJson();
  }
  try {
    const result = await loadSeasonRatings(Number(id), Number(season));
    if (!result) {
      return notFoundJson('short');
    }
    return publicJson(toSeasonRatingsView(result), {
      life: isEmptyRatings(result) ? 'no-store' : 'medium',
    });
  } catch {
    return failedJson();
  }
}
