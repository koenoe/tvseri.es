import {
  failedJson,
  publicJson,
  unavailableJson,
} from '@/app/api/cacheHeaders';
import { isUnavailable } from '@/lib/cache/unavailable';

import { latestStatsYear } from './latestYear';

/** A username as the API stores them (`UsernameSchema`), older forms too */
const USERNAME = /^[\w.-]{1,128}$/;

/**
 * GET /api/stats/:username → `{ year: number | null }`: the newest year the
 * user's public Stats page has something to show, or `null` (no stats yet);
 * a 404 with `{ year: null }` for no such user (the 401 then
 * claims nothing about them). For pages that offer a link to someone's
 * stats without knowing them (the signed-out profile 401), so the link
 * never leads to an empty page or a 404. Public, CDN-cached; no session read.
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<{ username: string }> }>,
) {
  const { username } = await params;
  const noUser = () =>
    publicJson({ year: null }, { life: 'short', status: 404 });
  if (!USERNAME.test(username)) {
    return noUser();
  }
  try {
    const year = await latestStatsYear(username);
    if (isUnavailable(year)) {
      return unavailableJson();
    }
    if (year === 'no-user') {
      return noUser();
    }
    return publicJson({ year }, { life: 'short' });
  } catch {
    return failedJson();
  }
}
