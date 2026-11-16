import {
  getBecauseYouWatched,
  getContinueWatching,
  getGetStarted,
  getIfYouLiked,
  getMoreGenre,
  getViewer,
  getViewerToken,
  readAsViewer,
} from './data/personal';
import BecauseYouWatchedRow from './personal/BecauseYouWatchedRow';
import ContinueWatching from './personal/ContinueWatching';
import GetStarted from './personal/GetStarted';
import MoreGenreRow from './personal/MoreGenreRow';
import { type PlacedProps, ToySection } from './Sections';
import IfYouLiked from './toy/IfYouLiked';

/**
 * The signed-in touches (HMFinal "streamed"): Suspense children that read
 * `auth()`. Signed out they render nothing. They don't use `'use cache:
 * private'` (the board's caching panel names it): in production it keeps
 * nothing across requests, only within one request (which `apiFetch`
 * already dedupes) and in the browser's router memory; the API answers these
 * routes with `private, max-age=86400` itself.
 */

/**
 * Right under the spotlight: Get started for a new user, else Continue
 * watching. The row's reads start at once from the token, side by side with
 * the profile (`GET /me`), instead of one after the other; a new user's Get
 * started check follows the profile (it needs the account's age). The other
 * rows do the same through `readAsViewer`.
 */
export async function ContinueOrGetStarted() {
  const accessToken = await getViewerToken();
  if (!accessToken) {
    return null;
  }
  const continueWatching = getContinueWatching(accessToken);
  // Get started may win the slot; its failure is then nobody's
  continueWatching.catch(() => undefined);
  const viewer = await getViewer();
  if (!viewer) {
    return null;
  }
  const status = await getGetStarted(viewer);
  if (status) {
    return <GetStarted status={status} username={viewer.user.username} />;
  }
  const data = await continueWatching;
  return data ? (
    <ContinueWatching
      first={data.first}
      items={data.items}
      now={Date.now()}
      second={data.second}
      username={viewer.user.username}
    />
  ) : null;
}

type DayProps = Readonly<{ day: string }>;

export async function BecauseYouWatchedSection({ day }: DayProps) {
  const data = await readAsViewer((accessToken) =>
    getBecauseYouWatched(accessToken, day),
  );
  return data ? <BecauseYouWatchedRow data={data} /> : null;
}

export async function MoreGenreSection({ day }: DayProps) {
  const data = await readAsViewer((accessToken) =>
    getMoreGenre(accessToken, day),
  );
  return data ? <MoreGenreRow data={data} /> : null;
}

/** On "If you liked" days: signed in, it takes the toy slot; else the toy */
export async function ToyOrIfYouLiked({ day, placeholder }: PlacedProps) {
  const data = await readAsViewer((accessToken) =>
    getIfYouLiked(accessToken, day).catch(() => null),
  );
  return data ? (
    <IfYouLiked data={data} />
  ) : (
    <ToySection day={day} placeholder={placeholder} />
  );
}
