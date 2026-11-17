import { jumpRange, parseMonthKey } from '@/lib/profile/diary';
import { loadHistoryTimeZone, loadNewerMonth } from '@/lib/profile/history';
import { loadHistoryPage } from '@/lib/profile/pages';

import { privateJson, viewerRoute } from '../../../handlers';
import requireProfile from '../../requireProfile';

type Context = Readonly<{ params: Promise<{ username: string }> }>;

/** A query value that must be a month when present: `undefined` absent, null malformed */
function monthParam(search: URLSearchParams, name: string) {
  const value = search.get(name);
  return value === null ? undefined : parseMonthKey(value);
}

const badRequest = () =>
  privateJson({ error: 'month and within take one YYYY-MM month' }, 400);

/**
 * The History diary's pages after the first:
 * - `month` (a jumped list): everything up to the end of that month, the
 *   range derived again on every page, because a cursor continues only
 *   under the range it came from;
 * - `within` ("Newer: April 2024", the page above): that whole month, with
 *   the month above it as `prevCursor`. It wins over `month`, which stays
 *   in the list's endpoint for the pages below.
 */
export const GET = viewerRoute(async (viewer, req, { params }: Context) => {
  const search = req.nextUrl.searchParams;
  const month = monthParam(search, 'month');
  const within = monthParam(search, 'within');
  if (month === null || within === null) {
    return badRequest();
  }
  const { username } = await params;
  const gate = await requireProfile(req, viewer, username);
  if (gate instanceof Response) {
    return gate;
  }
  if (within) {
    return Response.json(await loadNewerMonth(gate, within));
  }
  // a jump's range ends at the month's end in the owner's zone
  const range = month
    ? jumpRange(month, await loadHistoryTimeZone(gate.userId))
    : {};
  const page = await loadHistoryPage({
    ...gate,
    ...range,
    cursor: search.get('cursor'),
    limit: 100,
  });
  return Response.json(page);
});
