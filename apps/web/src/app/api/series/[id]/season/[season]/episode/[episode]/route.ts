import { toEpisodeModalCredits } from '@/app/(site)/[id]/[[...slug]]/_components/episode-modal/episodeCredits';
import { failedJson, notFoundJson, publicJson } from '@/app/api/cacheHeaders';
import { isSeriesId } from '@/app/api/handlers';
import { isUnavailable } from '@/lib/cache/unavailable';
import {
  loadEpisodeWithCredits,
  loadSeriesCredits,
} from '@/lib/series/loaders';

const SEASON = /^\d{1,3}$/;
const EPISODE = /^\d{1,4}$/;

type Params = Readonly<{ id: string; season: string; episode: string }>;

/**
 * An episode's guest stars and crew plus the show's regulars, for the
 * episode modal: public, CDN-cached like the API's `short` profile, trimmed
 * to `EpisodeModalCredits`. The regulars are best effort: without them the
 * modal still has the episode's own credits.
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<Params> }>,
) {
  const { episode, id, season } = await params;
  if (!isSeriesId(id) || !SEASON.test(season) || !EPISODE.test(episode)) {
    return notFoundJson();
  }
  const seriesId = Number(id);
  try {
    const [details, regulars] = await Promise.all([
      loadEpisodeWithCredits(seriesId, Number(season), Number(episode)),
      loadSeriesCredits(seriesId).catch(() => null),
    ]);
    const credits = isUnavailable(regulars) ? null : regulars;
    if (!details) {
      return notFoundJson('short');
    }
    return publicJson(toEpisodeModalCredits(details, credits?.cast ?? []), {
      life: credits ? 'short' : 'no-store',
    });
  } catch {
    return failedJson();
  }
}
