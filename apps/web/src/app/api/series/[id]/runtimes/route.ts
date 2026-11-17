import {
  failedJson,
  notFoundJson,
  publicJson,
  unavailableJson,
} from '@/app/api/cacheHeaders';
import { isSeriesId } from '@/app/api/handlers';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadRuntimes } from '@/lib/series/loaders';

/**
 * Every regular season's episode runtimes for the show page's client parts
 * (the season panel's lines, the history sheet's time left): one request
 * for the whole show instead of one per season. Public, CDN-cached like the
 * API's `short` profile.
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
) {
  const { id } = await params;
  if (!isSeriesId(id)) {
    return notFoundJson();
  }
  try {
    const runtimes = await loadRuntimes(Number(id));
    if (isUnavailable(runtimes)) {
      return unavailableJson();
    }
    return publicJson(runtimes, { life: 'short' });
  } catch {
    return failedJson();
  }
}
