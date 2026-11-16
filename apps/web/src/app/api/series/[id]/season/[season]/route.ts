import { toShowSeasonEpisodes } from '@/app/(site)/[id]/[[...slug]]/_lib/seasonEpisodes';
import { failedJson, notFoundJson, publicJson } from '@/app/api/cacheHeaders';
import { isSeriesId } from '@/app/api/handlers';
import { loadSeason } from '@/lib/series/loaders';

const SEASON = /^\d{1,3}$/;

/**
 * A season's episodes for the show page's client parts (season select, the
 * history sheet, the episode modal): public, CDN-cached like the API's
 * `short` profile, trimmed to `ShowSeasonEpisodes`.
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
    const result = await loadSeason(Number(id), Number(season));
    if (!result) {
      return notFoundJson('short');
    }
    return publicJson(toShowSeasonEpisodes(result), { life: 'short' });
  } catch {
    return failedJson();
  }
}
