import 'server-only';

import type { LibraryIds, ListItemWithFacts } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';
import { statusLabel } from '@/lib/format/status';
import { isNewToViewer } from '@/lib/marking/librarySets';
import { loadSeriesOrNull } from '@/lib/series/loaders';

import { loadCircle } from '../../../_data/circle';
import { loadViewerLibrary } from '../../../_data/library';
import { type Profile, withToken } from '../../../_data/profile';
import { orNull } from '../../../_lib/orNull';
import { borrowedUpNextIds } from '../../overview/up-next/loadUpNext';
import { cardOfSeries } from './cardOfSeries';
import { type StartCard, seasonsLabel } from './startCards';
import { loadTrendingCards } from './trending';

/** Where the deck's cards come from: the owner's own list first */
export type StartSource = 'watchlist' | 'circle' | 'trending';

export type StartDeck = Readonly<{
  cards: ReadonlyArray<StartCard>;
  source: StartSource;
}>;

/** The most cards one deal can reach */
const MAX = 20;
/** A borrowed deck's cards (a short fan) */
const BORROWED = 8;
/** Saved shows before the deck is your watchlist: with fewer, Roll again would pick from one or two */
const OWN_DECK = 3;
/** Cards that get their network logo (one cached show read each) */
const WITH_LOGO = 8;

/** The owner's saved shows that have a poster, newest first */
async function watchlistItems(
  profile: Profile,
): Promise<ReadonlyArray<ListItemWithFacts>> {
  const page = await apiFetch<
    Readonly<{ items: ReadonlyArray<ListItemWithFacts> }>
  >('/user/:id/list/:list', {
    ...withToken(profile),
    params: { id: profile.user.id, list: 'watchlist' },
    query: { include: 'facts', limit: MAX },
  });
  return page.items.filter((item) => item.posterImage);
}

/** The watchlist as deck cards, the first few with their network logo */
async function watchlistCards(
  items: ReadonlyArray<ListItemWithFacts>,
): Promise<ReadonlyArray<StartCard>> {
  const series = await Promise.all(
    items.map((item, index) =>
      index < WITH_LOGO ? loadSeriesOrNull(item.id) : Promise.resolve(null),
    ),
  );
  return items.map((item, index) => {
    const network = series[index]?.network;
    return {
      id: item.id,
      poster: item.posterImage,
      provider: network?.logo
        ? { logo: network.logo, name: network.name }
        : null,
      seasons: seasonsLabel(item.facts?.seasonCount ?? 1, true),
      slug: item.slug,
      status: statusLabel({
        renewedSeason: item.facts?.renewedSeason,
        status: item.facts?.status ?? item.status,
      }),
      title: item.title,
    };
  });
}

/**
 * Shows the people you follow finished. The circle's picks also hold
 * favourites; those stay out, so the badge "Finished by people you follow"
 * is always true.
 */
async function circleCards(
  profile: Profile,
): Promise<ReadonlyArray<StartCard>> {
  const circle = await orNull(loadCircle(profile));
  const finished = (circle?.picks ?? []).filter(
    (pick) => pick.kind === 'finished',
  );
  const series = await Promise.all(
    finished.map((pick) => loadSeriesOrNull(pick.show.id)),
  );
  return series.flatMap((show) =>
    show?.posterImage ? [cardOfSeries(show)] : [],
  );
}

/**
 * The deck: the owner's watchlist once it holds three shows, else shows the
 * people they follow finished, else Popular this week. A borrowed deck
 * (circle, trending) never repeats a show Up next borrowed nor one already
 * in the library (watching, finished, saved: it is something new).
 */
export async function loadStartDeck(profile: Profile): Promise<StartDeck> {
  const watchlist = await watchlistItems(profile);
  if (watchlist.length >= OWN_DECK) {
    return { cards: await watchlistCards(watchlist), source: 'watchlist' };
  }
  // A borrowed deck only leaves the saved shows out: no logo reads for them
  const [circle, upNext, library] = await Promise.all([
    circleCards(profile),
    borrowedUpNextIds(profile),
    loadViewerLibrary(profile),
  ]);
  // Never a show Up next borrowed, nor one already saved
  const taken = new Set([...upNext, ...watchlist.map((item) => item.id)]);
  const borrowed = (cards: ReadonlyArray<StartCard>) =>
    borrowable(cards, taken, library).slice(0, BORROWED);
  if (circle.length > 0) {
    return { cards: borrowed(circle), source: 'circle' };
  }
  return { cards: borrowed(await loadTrendingCards()), source: 'trending' };
}

/**
 * The cards a borrowed deck may offer: none in `taken`, none in the
 * viewer's library (`isNewToViewer`; all but `taken` when it didn't load)
 */
export function borrowable<T extends Readonly<{ id: number }>>(
  cards: ReadonlyArray<T>,
  taken: ReadonlySet<number>,
  library: LibraryIds | null,
): ReadonlyArray<T> {
  return withoutShows(cards, taken).filter(
    (card) => library === null || isNewToViewer(library, card.id),
  );
}

/** `items` without the shows in `ids`, in order */
export function withoutShows<T extends Readonly<{ id: number }>>(
  items: ReadonlyArray<T>,
  ids: ReadonlySet<number>,
): ReadonlyArray<T> {
  return items.filter((item) => !ids.has(item.id));
}
