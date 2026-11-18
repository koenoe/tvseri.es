import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  episodeCode,
  type LibraryCounts,
  type LibraryFilter,
  type LibraryItem,
  type LibraryPage,
  type LibraryProgress,
  type LibraryShelf,
  type LibrarySort,
  type SeriesFacts,
  type SeriesPrefs,
  type WatchingNow,
} from '@tvseri.es/schemas';
import {
  buildPosterImageUrl,
  endOfDayUtc,
  type LibraryEntry,
  type LibraryLetter,
  queryShelf,
  shelfCounts,
  shelfDate,
  shelvesOf,
} from '@tvseri.es/utils';
import { Resource } from 'sst';

import client from '@/lib/db/client';
import { getLibraryIds } from '@/lib/db/list';
import {
  LIST_PREFIX,
  listIndexPk,
  PREF_PREFIX,
  parseListItemSk,
  parsePrefSk,
  userPk,
} from '@/lib/db/list/keys';
import { getSeriesPrefsMany } from '@/lib/db/prefs';
import { queryAll } from '@/lib/db/query';
import { analyzeShow, type WatchedEpisode } from '@/lib/overview/analyze';
import { readShowItems } from '@/lib/rollups';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { airedEpisodesAt, seasonsOutlookAt } from '@/lib/seriesFacts/aired';
import { createLimiter } from '@/utils/limit';

/**
 * The profile Library: one user's lists and prefs read in two
 * Queries of their Lists partition, merged into one entry per show, then
 * shelved, sorted, filtered and paged in memory by `@tvseri.es/utils`
 * (the stub API runs the same code). Reads only; writes nothing.
 */

/** "Most left" reads progress for at most this many watching shows (most recently active first) */
const LEFT_SORT_CAP = 200;

const WATCHED_CONCURRENCY = 10;

const LISTS = {
  FAVORITES: 'favouriteAt',
  IN_PROGRESS: 'activeAt',
  WATCHED: 'finishedAt',
  WATCHLIST: 'watchlistAt',
} as const;

type ListName = keyof typeof LISTS;

type Prefs = Pick<SeriesPrefs, 'skipped' | 'paused' | 'pausedAt'>;

const NO_PREFS: Prefs = { paused: null, pausedAt: null, skipped: [] };

export type Library = Readonly<{
  entries: ReadonlyArray<LibraryEntry>;
  /** Poster URLs of items written before `posterPath` existed */
  legacyPosters: ReadonlyMap<number, string>;
  prefs: ReadonlyMap<number, Prefs>;
}>;

/**
 * Every item of the partition under one sort-key prefix, paged until
 * DynamoDB has nothing left (a 1 MB page holds about 2,500 list items).
 */
const queryPrefix = async (
  userId: string,
  prefix: string,
  attributes: ReadonlyArray<string>,
) => {
  return queryAll({
    ExpressionAttributeNames: Object.fromEntries(
      attributes.map((name, index) => [`#a${index}`, name]),
    ),
    ExpressionAttributeValues: marshall({
      ':pk': userPk(userId),
      ':prefix': prefix,
    }),
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ProjectionExpression: attributes.map((_, index) => `#a${index}`).join(', '),
    TableName: Resource.Lists.name,
  });
};

type Draft = {
  -readonly [K in keyof LibraryEntry]: LibraryEntry[K];
};

/**
 * A user's whole library: the list items (`LIST#`) and the prefs (`PREF#`)
 * of their Lists partition, in two Queries (parked watchlist copies,
 * `PARKED#`, sit between the two prefixes and are never read). Custom
 * lists and RESUMING_SOON (a subset of Finished) are left out.
 */
export const readLibrary = async (userId: string): Promise<Library> => {
  const [listItems, prefItems] = await Promise.all([
    queryPrefix(userId, LIST_PREFIX, [
      'sk',
      'createdAt',
      'title',
      'slug',
      'posterPath',
      'posterImage',
    ]),
    queryPrefix(userId, PREF_PREFIX, ['sk', 'paused', 'pausedAt', 'skipped']),
  ]);

  const prefs = new Map<number, Prefs>();
  for (const item of prefItems) {
    const seriesId = parsePrefSk(String(item.sk));
    if (seriesId !== null) {
      prefs.set(seriesId, {
        paused: (item.paused as Prefs['paused']) ?? null,
        pausedAt: typeof item.pausedAt === 'number' ? item.pausedAt : null,
        skipped: [...((item.skipped as Set<string> | undefined) ?? [])].sort(),
      } as Prefs);
    }
  }

  const drafts = new Map<number, Draft>();
  const legacyPosters = new Map<number, string>();
  for (const item of listItems) {
    const parsed = parseListItemSk(String(item.sk));
    const list = parsed?.listId as ListName | undefined;
    if (!parsed || !list || !(list in LISTS)) {
      continue;
    }
    const id = parsed.id;
    const draft: Draft = drafts.get(id) ?? {
      activeAt: null,
      favouriteAt: null,
      finishedAt: null,
      hiddenAt: null,
      id,
      posterPath: null,
      slug: '',
      title: '',
      watchlistAt: null,
    };
    draft[LISTS[list]] = Number(item.createdAt ?? 0);
    draft.title ||= String(item.title ?? '');
    draft.slug ||= String(item.slug ?? '');
    draft.posterPath ??= (item.posterPath as string | undefined) || null;
    if (typeof item.posterImage === 'string' && item.posterImage) {
      legacyPosters.set(id, item.posterImage);
    }
    drafts.set(id, draft);
  }

  const entries = [...drafts.values()].map((draft): LibraryEntry => {
    const showPrefs = prefs.get(draft.id);
    return {
      ...draft,
      hiddenAt:
        draft.activeAt !== null && showPrefs?.paused === 'hide'
          ? (showPrefs.pausedAt ?? 0)
          : null,
    };
  });
  return { entries, legacyPosters, prefs };
};

export const getLibrarySummary = async (
  ownerId: string,
  { owner }: Readonly<{ owner: boolean }>,
): Promise<LibraryCounts> =>
  shelfCounts((await readLibrary(ownerId)).entries, { owner });

/** The owner's progress in one show (regular episodes only) */
const toProgress = (
  facts: SeriesFacts,
  watched: ReadonlyArray<WatchedEpisode>,
  prefs: Prefs,
  now: number,
): LibraryProgress => {
  const state = analyzeShow({ facts, prefs, watched }, now);
  const regular = watched.filter((episode) => episode.seasonNumber > 0);
  const latest = regular.reduce<WatchedEpisode | null>(
    (newest, episode) =>
      !newest || episode.watchedAt > newest.watchedAt ? episode : newest,
    null,
  );
  const next = facts.nextEpisodeToAir;
  return {
    aired: airedEpisodesAt(facts, now).total,
    airing: Boolean(
      next?.airDate &&
        endOfDayUtc(next.airDate) > now &&
        next.episodeNumber > 1,
    ),
    lastSeason: latest?.seasonNumber ?? null,
    lastWatched: state.lastWatched
      ? episodeCode({
          episodeNumber: state.lastWatched.episode,
          seasonNumber: state.lastWatched.season,
        })
      : null,
    next: state.nextUp
      ? episodeCode({
          episodeNumber: state.nextUp.episode,
          seasonNumber: state.nextUp.season,
        })
      : null,
    total: facts.numberOfEpisodes,
    toWatch: state.unwatched.length,
    watched: new Set(regular.map((episode) => episodeCode(episode))).size,
  };
};

/** Progress for each show TMDB knows, from its watched items */
const progressOf = (
  ids: ReadonlyArray<number>,
  facts: ReadonlyMap<number, SeriesFacts>,
  items: ReadonlyMap<number, ReadonlyArray<WatchedEpisode>>,
  prefs: ReadonlyMap<number, Prefs>,
  now: number,
): Map<number, LibraryProgress> =>
  new Map(
    ids.flatMap((id) => {
      const showFacts = facts.get(id);
      return showFacts
        ? [
            [
              id,
              toProgress(
                showFacts,
                items.get(id) ?? [],
                prefs.get(id) ?? NO_PREFS,
                now,
              ),
            ] as const,
          ]
        : [];
    }),
  );

/** The shelves whose tiles draw the finished date (or "Seen, no date") */
const FINISHED_DATE_SHELVES: ReadonlyArray<LibraryShelf> = [
  'finished',
  'favourites',
];

/**
 * Finished shows whose every regular episode is "I don't remember" (Get
 * started's "Seen it"), from their watched items.
 */
const undatedOf = (
  ids: ReadonlyArray<number>,
  items: ReadonlyMap<number, ReadonlyArray<WatchedEpisode>>,
): ReadonlySet<number> =>
  new Set(
    ids.filter((id) => {
      const regular = (items.get(id) ?? []).filter(
        (episode) => episode.seasonNumber > 0,
      );
      return (
        regular.length > 0 && regular.every((episode) => episode.dateUnknown)
      );
    }),
  );

const fractionOf = (progress: LibraryProgress) =>
  progress.aired > 0 ? (progress.aired - progress.toWatch) / progress.aired : 1;

/** The shelves whose tiles draw progress */
const PROGRESS_SHELVES: ReadonlyArray<LibraryShelf> = [
  'watching',
  'hidden',
  'favourites',
];

export type ShelfPageInput = Readonly<{
  ownerId: string;
  /** null: the owner is looking */
  visitorId: string | null;
  shelf: LibraryShelf;
  sort: LibrarySort;
  q?: string;
  from?: LibraryLetter;
  with?: LibraryFilter;
  cursor?: string;
  before?: string;
  limit: number;
  now: number;
}>;

/**
 * One page of a shelf. Reads: the owner's library (2 Queries); a visitor's
 * own list ids (1 keys-only Query, for the filters); then, side by side, the
 * facts of the page's shows (Cache table, TMDB on a miss) and one per-show
 * summaries read for the shows whose tiles draw progress or "Seen, no date".
 * `sort=left` first reads facts and progress for up to 200 watching shows.
 * Throws `LibraryQueryError` (400).
 */
export const getShelfPage = async (
  input: ShelfPageInput,
): Promise<LibraryPage> => {
  const owner = input.visitorId === null;
  const [library, viewer] = await Promise.all([
    readLibrary(input.ownerId),
    input.visitorId ? getLibraryIds(input.visitorId) : undefined,
  ]);

  let facts = new Map<number, SeriesFacts>();
  let progress = new Map<number, LibraryProgress>();
  if (input.sort === 'left') {
    const watching = library.entries
      .filter((entry) => entry.activeAt !== null && entry.hiddenAt === null)
      .sort((a, b) => (b.activeAt ?? 0) - (a.activeAt ?? 0))
      .slice(0, LEFT_SORT_CAP)
      .map((entry) => entry.id);
    const [watchingFacts, items] = await Promise.all([
      getSeriesFacts(watching),
      readShowItems(input.ownerId, watching),
    ]);
    facts = new Map(watchingFacts);
    progress = progressOf(watching, facts, items, library.prefs, input.now);
  }

  const result = queryShelf(library.entries, {
    before: input.before,
    cursor: input.cursor,
    from: input.from,
    limit: input.limit,
    owner,
    progress:
      input.sort === 'left'
        ? new Map([...progress].map(([id, value]) => [id, fractionOf(value)]))
        : undefined,
    q: input.q,
    shelf: input.shelf,
    sort: input.sort,
    viewer,
    with: input.with,
  });

  const missingFacts = result.items
    .map((entry) => entry.id)
    .filter((id) => !facts.has(id));
  const drawsProgress = PROGRESS_SHELVES.includes(input.shelf);
  const needProgress = drawsProgress
    ? result.items
        .filter((entry) => entry.activeAt !== null && !progress.has(entry.id))
        .map((entry) => entry.id)
    : [];
  const datesFinish = FINISHED_DATE_SHELVES.includes(input.shelf);
  const finished = datesFinish
    ? result.items
        .filter((entry) => entry.finishedAt !== null)
        .map((entry) => entry.id)
    : [];
  // The page's facts and its shows' watched items (progress and "Seen, no
  // date" share one summaries read) side by side
  const [pageFacts, items] = await Promise.all([
    getSeriesFacts(missingFacts),
    readShowItems(input.ownerId, [...needProgress, ...finished]),
  ]);
  for (const [id, value] of pageFacts) {
    facts.set(id, value);
  }
  for (const [id, value] of progressOf(
    needProgress,
    facts,
    items,
    library.prefs,
    input.now,
  )) {
    progress.set(id, value);
  }
  const undated = undatedOf(finished, items);

  return {
    ...result,
    filters: result.filters,
    items: result.items.map((entry): LibraryItem => {
      const showFacts = facts.get(entry.id);
      const posterPath = entry.posterPath ?? showFacts?.posterPath ?? null;
      return {
        addedAt: shelfDate(entry, input.shelf),
        facts: showFacts
          ? {
              hasAired: airedEpisodesAt(showFacts, input.now).total > 0,
              renewedSeason: seasonsOutlookAt(showFacts, input.now)
                .renewedSeason,
              seasonCount: showFacts.seasons.length,
              status: showFacts.status,
              totalRuntime: showFacts.totalRuntime,
              type: showFacts.type,
            }
          : null,
        finishedAt: entry.finishedAt,
        hiddenAt: owner ? entry.hiddenAt : null,
        id: entry.id,
        on: shelvesOf(entry, { owner }),
        posterImage: posterPath
          ? buildPosterImageUrl(posterPath)
          : (library.legacyPosters.get(entry.id) ?? ''),
        progress:
          drawsProgress && entry.activeAt !== null
            ? (progress.get(entry.id) ?? null)
            : null,
        slug: entry.slug || showFacts?.slug || '',
        title: entry.title || showFacts?.title || '',
        ...(datesFinish ? { undated: undated.has(entry.id) } : {}),
      };
    }),
    letters: [...result.letters],
  };
};

/** In progress items read per person: the first one not hidden wins */
const WATCHING_CANDIDATES = 5;

/**
 * What someone is watching now, cheaply: their 5 most recent In progress
 * items (Lists `gsi2`, newest first) and those shows' prefs (one
 * BatchGetItem); the first not hidden wins. null when nothing is in
 * progress or all 5 are hidden.
 */
const readWatchingNow = async (userId: string): Promise<WatchingNow | null> => {
  const result = await client.send(
    new QueryCommand({
      ExpressionAttributeNames: {
        '#createdAt': 'createdAt',
        '#id': 'id',
        '#slug': 'slug',
        '#title': 'title',
      },
      ExpressionAttributeValues: marshall({
        ':pk': listIndexPk(userId, 'IN_PROGRESS'),
      }),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      Limit: WATCHING_CANDIDATES,
      ProjectionExpression: '#id, #title, #slug, #createdAt',
      ScanIndexForward: false,
      TableName: Resource.Lists.name,
    }),
  );
  const candidates = (result.Items ?? []).map(
    (item) => unmarshall(item) as { id: number; title: string; slug: string },
  );
  if (candidates.length === 0) {
    return null;
  }
  const prefs = await getSeriesPrefsMany(
    userId,
    candidates.map((candidate) => candidate.id),
  );
  const show = candidates.find(
    (candidate) => prefs.get(candidate.id)?.paused !== 'hide',
  );
  return show
    ? { seriesId: show.id, slug: show.slug, title: show.title }
    : null;
};

/** `readWatchingNow` for each id, 10 at a time */
export const readWatchingNowMany = async (
  userIds: ReadonlyArray<string>,
): Promise<ReadonlyMap<string, WatchingNow | null>> => {
  const limit = createLimiter(WATCHED_CONCURRENCY);
  return new Map(
    await Promise.all(
      userIds.map((id) =>
        limit(async () => [id, await readWatchingNow(id)] as const),
      ),
    ),
  );
};
