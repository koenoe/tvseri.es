import {
  failedJson,
  notFoundJson,
  publicJson,
  unavailableJson,
} from '@/app/api/cacheHeaders';
import { isTmdbId } from '@/app/api/handlers';
import { isUnavailable } from '@/lib/cache/unavailable';
import { toCastAndCrew } from '@/lib/series/castAndCrew';
import { loadSeries, loadSeriesCredits } from '@/lib/series/loaders';

/**
 * Everyone who made a show, for the show page's cast & crew sheet: the
 * whole cast, then the crew in IMDb's sections, trimmed to the face, name
 * and role. A route, not part of the page: a long-running show lists hundreds, and only
 * the viewers who open the sheet should pay for them. Public, CDN-cached on
 * the shorter life of its two reads (the show's `short`).
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
) {
  const { id } = await params;
  if (!isTmdbId(id)) {
    return notFoundJson();
  }
  const seriesId = Number(id);
  try {
    const [series, credits] = await Promise.all([
      loadSeries(seriesId),
      loadSeriesCredits(seriesId),
    ]);
    if (isUnavailable(series) || isUnavailable(credits)) {
      return unavailableJson();
    }
    if (!series || series.isAdult) {
      return notFoundJson('short');
    }
    return publicJson(
      toCastAndCrew(series.createdBy, credits?.cast ?? [], credits?.crew ?? []),
      { life: 'short' },
    );
  } catch {
    return failedJson();
  }
}
