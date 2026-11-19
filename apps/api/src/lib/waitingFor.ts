import type {
  ListItem,
  SeriesFacts,
  WaitingFor,
  WaitingForItem,
} from '@tvseri.es/schemas';
import {
  byExpectedReturn,
  DAY_MS,
  firstSeasonAfter,
  isOver,
  startOfDayUtc,
} from '@tvseri.es/utils';
import { getAllListItems } from '@/lib/db/list';
import { episodeKindOf } from '@/lib/episodeKind';
import { getSeriesFacts } from '@/lib/seriesFacts';

/** The season that is coming: an announced unaired one, else the one after the last aired */
const nextSeasonOf = (facts: SeriesFacts) => {
  const lastSeason = facts.lastEpisodeToAir?.seasonNumber ?? 0;
  return (
    firstSeasonAfter(
      facts.seasons.map((season) => season.seasonNumber),
      lastSeason,
    ) ?? lastSeason + 1
  );
};

/**
 * What each finished show is waiting for, from TMDB's current state: a dated
 * next episode (countdown), or renewed without a date. Ended and cancelled
 * shows are left out. No history: "renewed" is just "returning, no date".
 * Dated shows come first, soonest first; the renewed ones follow by when
 * their own rhythm says they're back (no estimate is shown).
 */
const buildWaitingFor = (
  finished: ReadonlyArray<ListItem>,
  facts: ReadonlyMap<number, SeriesFacts>,
  favourites: ReadonlySet<number>,
  now: number,
): WaitingFor => {
  const today = startOfDayUtc(now);
  const dated: WaitingForItem[] = [];
  const renewed: Array<
    Readonly<{
      favourite: boolean;
      finishedAt?: number;
      item: WaitingForItem;
      seasons: SeriesFacts['seasons'];
    }>
  > = [];

  for (const show of finished) {
    const showFacts = facts.get(show.id);
    if (!showFacts) continue;
    if (isOver(showFacts.status)) continue;

    const next = showFacts.nextEpisodeToAir;
    const base = {
      ...(show.createdAt && { finishedAt: show.createdAt }),
      posterImage: show.posterImage ?? '',
      seriesId: show.id,
      slug: show.slug,
      title: show.title,
    };

    if (next?.airDate) {
      dated.push({
        ...base,
        daysToGo: Math.max(
          0,
          Math.round((Date.parse(next.airDate) - today) / DAY_MS),
        ),
        nextDate: next.airDate,
        nextEpisode: next.episodeNumber,
        nextKind: episodeKindOf(next, showFacts.seasons),
        nextSeason: next.seasonNumber,
        state: 'dated',
      });
    } else {
      const nextSeason = nextSeasonOf(showFacts);
      // The facts list only seasons with episodes: a listed one has them
      const listedEpisodes = showFacts.seasons.find(
        (season) => season.seasonNumber === nextSeason,
      )?.episodeCount;
      const lastAired = showFacts.lastEpisodeToAir?.airDate;
      renewed.push({
        favourite: favourites.has(show.id),
        finishedAt: show.createdAt,
        item: {
          ...base,
          ...(lastAired && { lastAired }),
          ...(listedEpisodes && { listedEpisodes }),
          nextSeason,
          state: 'renewed',
        },
        seasons: showFacts.seasons,
      });
    }
  }

  dated.sort((a, b) => (a.nextDate ?? '').localeCompare(b.nextDate ?? ''));

  return {
    items: [
      ...dated,
      ...byExpectedReturn(renewed, now).map(({ item }) => item),
    ],
  };
};

// Finished shows looked at, most recently finished first (facts cost a TMDB
// call each on a cold cache); RESUMING_SOON shows are always included
const MAX_FINISHED = 150;

/**
 * The viewer's finished shows that come back (Coming up's returns), with
 * the facts read for them (the calendar's season reads)
 */
export const readWaitingFor = async (
  userId: string,
): Promise<
  Readonly<{ facts: ReadonlyMap<number, SeriesFacts>; waitingFor: WaitingFor }>
> => {
  // Favourites break ties in No date yet: read beside the others, so no
  // extra round trip (a curated list, short next to Finished)
  const [watched, resuming, favourites] = await Promise.all([
    getAllListItems({ listId: 'WATCHED', sortDirection: 'desc', userId }),
    getAllListItems({ listId: 'RESUMING_SOON', userId }),
    getAllListItems({ listId: 'FAVORITES', userId }),
  ]);

  const resumingIds = new Set(resuming.map((item) => item.id));
  const finished = [
    ...resuming,
    ...watched.filter((item) => !resumingIds.has(item.id)),
  ]
    .filter(
      (item, index, all) => all.findIndex((x) => x.id === item.id) === index,
    )
    .slice(0, Math.max(MAX_FINISHED, resuming.length));
  const byId = new Map(watched.map((item) => [item.id, item]));

  const facts = await getSeriesFacts(finished.map((item) => item.id));

  return {
    facts,
    waitingFor: buildWaitingFor(
      finished.map((item) => byId.get(item.id) ?? item),
      facts,
      new Set(favourites.map((item) => item.id)),
      Date.now(),
    ),
  };
};

/** The viewer's finished shows that come back (Coming up's returns) */
export const getWaitingFor = async (userId: string) =>
  (await readWaitingFor(userId)).waitingFor;
