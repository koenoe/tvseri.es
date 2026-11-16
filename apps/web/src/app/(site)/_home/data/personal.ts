import 'server-only';

import {
  type BecauseYouWatched,
  type GetStartedStatus,
  GetStartedStatusSchema,
  type MoreGenre,
  type Overview,
  type UpNextItem,
} from '@tvseri.es/schemas';
import { isIfYouLikedDay } from '@tvseri.es/utils';

import auth, { type Session } from '@/auth';
import { getViewer as getTokenViewer } from '@/auth/viewer';
import { loadUpNextArt } from '@/components/up-next/loadUpNextArt';
import type { UpNextArt } from '@/components/up-next/UpNextItemCard';
import { apiFetch } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';
import { isNewAccount } from '@/lib/profile/isNewAccount';

import { getViewerPaths } from '../toy/connected-by/data';
import { apiDate } from './day';
import { getHiddenGems, getPickDeck, getPremieres, getToy } from './home';
import { toyShowIds } from './momentShows';
import { idsOf, withoutNeighbours } from './neighbours';

/**
 * The streamed half of the home page: only ever called inside a Suspense
 * hole, after `auth()`. Signed out, every one of these is null and its hole
 * renders nothing (no skeleton). Token routes are private: never in
 * a shared cache.
 */

const ROW_LIMIT = 20;
/** Continue watching holds at most 8 shows */
const CONTINUE_LIMIT = 8;

/**
 * The session cookie holds a verified token but the profile (`GET /me`)
 * could not be read: a failed read, not a signed-out viewer, so the
 * personal row shows its failed state (with Try again) instead of vanishing
 * from the space its placeholder held.
 */
class ViewerUnavailableError extends Error {
  constructor() {
    super('The signed-in viewer could not be read');
    this.name = 'ViewerUnavailableError';
  }
}

/** Signed in: the session; signed out: null; a session that failed to load throws */
export async function getViewer(): Promise<Session | null> {
  const [session, claimed] = await Promise.all([auth(), getTokenViewer()]);
  if (session.user) {
    return session;
  }
  if (claimed) {
    throw new ViewerUnavailableError();
  }
  return null;
}

/**
 * The viewer's access token from the verified cookie alone (no `GET /me`),
 * so a personal read can start before the profile arrives
 */
export async function getViewerToken(): Promise<string | null> {
  return (await getTokenViewer())?.accessToken ?? null;
}

/**
 * A personal read that needs only the token: it starts from the verified
 * cookie at once, beside the profile (`GET /me`), which only decides signed
 * in or failed (`getViewer` throws when the profile can't be read, so the
 * row shows its failed state). Signed out: null, and nothing is read.
 */
export async function readAsViewer<T>(
  read: (accessToken: string) => Promise<T>,
): Promise<T | null> {
  const accessToken = await getViewerToken();
  if (!accessToken) {
    return null;
  }
  const [viewer, data] = await Promise.all([getViewer(), read(accessToken)]);
  return viewer ? data : null;
}

export type ContinueWatchingData = Readonly<{
  first: UpNextArt | null;
  /** the second show's, for when the first leaves after a mark */
  second: UpNextArt | null;
  items: ReadonlyArray<UpNextItem>;
}>;

/**
 * Continue watching: the viewer's Up next (`/me/overview?view=up-next`, the
 * API skips the blocks the row doesn't draw), then the first two shows'
 * art. Takes the token, not the session, so it starts while `GET /me` is
 * still on its way.
 */
export async function getContinueWatching(
  accessToken: string,
): Promise<ContinueWatchingData | null> {
  const overview = await apiFetch<Overview>('/me/overview', {
    accessToken,
    query: { view: 'up-next' },
  });
  const items = overview.upNext.slice(0, CONTINUE_LIMIT);
  const [head] = items;
  if (!head) {
    return null;
  }
  // the show page's own loader (cached; with images: the tile draws the
  // logo), for the head and the show that takes its place when it leaves
  const [first, second] = await Promise.all([
    loadUpNextArt(head.seriesId),
    loadUpNextArt(items[1]?.seriesId),
  ]);
  return { first, items, second };
}

/**
 * Get started: only in a user's first 30 days, until it hides itself. A
 * failed read fails the whole slot; the profile's `loadGetStartedStatus`
 * hides only its block. Deliberately separate failure policies.
 */
export async function getGetStarted(
  session: Session,
): Promise<GetStartedStatus | null> {
  if (!isNewAccount(session.user.createdAt, Date.now())) {
    return null;
  }
  // An answer that isn't a status fails like any failed read (the slot's
  // failed state), never a half-drawn block
  const status = await apiFetch('/me/get-started', {
    accessToken: session.accessToken,
    schema: GetStartedStatusSchema,
  });
  // Done, it is gone: the slot goes back to Continue watching at once
  return status.hidden || status.doneCount >= 3 ? null : status;
}

/** Shows of a shared section, or none when it is unavailable */
const showIdsOf = (
  items:
    | ReadonlyArray<Readonly<{ id: number }>>
    | Readonly<{ unavailable: true }>,
) => (isUnavailable(items) ? [] : idsOf(items));

/** Keeps the picks whose show no neighbour already has */
function pickedApart(
  data: BecauseYouWatched,
  neighbours: ReadonlyArray<ReadonlyArray<number>>,
  limit = ROW_LIMIT,
): BecauseYouWatched | null {
  const kept = new Set(
    idsOf(
      withoutNeighbours(
        data.items.map((item) => item.series),
        neighbours,
        limit,
      ),
    ),
  );
  const items = data.items.filter((item) => kept.has(item.series.id));
  return data.source && items.length > 0 ? { ...data, items } : null;
}

/** Because you watched X: gives way to the deck above and Hidden gems below */
export async function getBecauseYouWatched(
  accessToken: string,
  day: string,
): Promise<BecauseYouWatched | null> {
  const [data, deck, gems] = await Promise.all([
    apiFetch<BecauseYouWatched>('/me/home/because-you-watched', {
      accessToken,
      query: { date: apiDate(day) },
    }),
    getPickDeck(day),
    getHiddenGems(day),
  ]);
  return pickedApart(data, [showIdsOf(deck), showIdsOf(gems)]);
}

/** If you liked X (the signed-in toy): gives way to Premieres above */
export async function getIfYouLiked(
  accessToken: string,
  day: string,
): Promise<BecauseYouWatched | null> {
  const [data, premieres] = await Promise.all([
    apiFetch<BecauseYouWatched>('/me/home/if-you-liked', {
      accessToken,
      query: { date: apiDate(day) },
    }),
    getPremieres(day),
  ]);
  const above = isUnavailable(premieres)
    ? []
    : premieres.map((premiere) => premiere.series.id);
  return pickedApart(data, [above], Number.POSITIVE_INFINITY);
}

/**
 * More {genre}: gives way to the slot above it, the toy of the day, or on
 * If you liked days what that card shows this viewer.
 */
export async function getMoreGenre(
  accessToken: string,
  day: string,
): Promise<MoreGenre | null> {
  const [data, above] = await Promise.all([
    apiFetch<MoreGenre>('/me/home/more-genre', { accessToken }),
    toySlotShowIds(accessToken, day),
  ]);
  if (!data.genre) {
    return null;
  }
  const items = withoutNeighbours(data.items, [above], ROW_LIMIT);
  return items.length > 0 ? { ...data, items } : null;
}

async function toySlotShowIds(
  accessToken: string,
  day: string,
): Promise<ReadonlyArray<number>> {
  if (isIfYouLikedDay(day)) {
    // the same call as the slot's (apiFetch dedupes GETs per render)
    const liked = await getIfYouLiked(accessToken, day).catch(() => null);
    if (liked) {
      return liked.items.map((item) => item.series.id);
    }
  }
  const toy = await getToy(day);
  if (isUnavailable(toy) || !toy) {
    return [];
  }
  if (toy.toy.kind === 'connected-by') {
    // what the card shows this viewer (the same reads as the slot's)
    const mine = await getViewerPaths(accessToken, day, toy.toy.paths).catch(
      () => null,
    );
    if (mine) {
      return toyShowIds({ kind: 'connected-by', paths: mine });
    }
  }
  return toyShowIds(toy.toy);
}
