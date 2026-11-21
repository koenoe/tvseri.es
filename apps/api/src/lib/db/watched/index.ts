import { type AttributeValue, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  type EpisodeForWatched,
  episodeCode,
  type PaginationOptions,
  type RecentScrobble,
  type TvSeriesForWatched,
  type WatchedItem,
  type WatchProvider,
} from '@tvseri.es/schemas';
import {
  buildLogoImageUrl,
  buildPosterImageUrl,
  buildStillImageUrl,
} from '@tvseri.es/utils';
import { Resource } from 'sst';
import { createLimiter } from '@/utils/limit';
import { batchWrite } from '../batch';
import client from '../client';
import { countQuery } from '../count';
import { decodeCursor, encodeCursor } from '../cursor';
import { type QueryInput, queryPages } from '../query';
import {
  EPISODE_SK,
  episodeIndexSk,
  episodeSk,
  historyIndexPk,
  seasonIndexPrefix,
  seriesIndexPk,
  seriesSkPrefix,
  seriesSkRange,
  WATCHED_SK_PREFIX,
  watchedPk,
} from './keys';

const BASE_QUERY_CONCURRENCY = 10;

/** Table and index keys stored on every watched item */
const KEY_ATTRIBUTES: ReadonlySet<string> = new Set([
  'gsi1pk',
  'gsi1sk',
  'gsi2pk',
  'gsi2sk',
  'pk',
  'sk',
]);

/**
 * Drops the table/index keys from a stored watched item: they're storage
 * details, not part of the WatchedItem contract. Every read that returns
 * watched items in a response goes through this.
 */
const toWatchedItemResponse = <T extends Partial<WatchedItem>>(item: T): T =>
  Object.fromEntries(
    Object.entries(item).filter(([key]) => !KEY_ATTRIBUTES.has(key)),
  ) as T;

/**
 * The fields progress UI reads (`?view=progress`): season, episode, runtime,
 * watchedAt and dateUnknown (only present when true).
 */
export const PROGRESS_ATTRIBUTES = [
  'dateUnknown',
  'episodeNumber',
  'runtime',
  'seasonNumber',
  'watchedAt',
] as const satisfies ReadonlyArray<keyof WatchedItem>;

/**
 * A ProjectionExpression (with attribute name placeholders, so reserved words
 * are never an issue) for reads that only need a few attributes.
 */
const projection = (attributes: ReadonlyArray<keyof WatchedItem>) => ({
  ExpressionAttributeNames: Object.fromEntries(
    attributes.map((attribute, index) => [`#p${index}`, attribute]),
  ),
  ProjectionExpression: attributes.map((_, index) => `#p${index}`).join(', '),
});

/**
 * When an episode was watched: a date, or "I don't remember" (`dateUnknown`,
 * with `watchedAt` holding when it was marked).
 */
export type WatchedWhen = Readonly<{
  watchedAt: number;
  dateUnknown?: true;
}>;

const createWatchedItem = ({
  dateUnknown,
  episode,
  importId,
  tvSeries,
  userId,
  watchProvider,
  watchedAt,
}: WatchedPut): WatchedItem => ({
  ...(dateUnknown && { dateUnknown }),
  ...(importId && { importId }),
  episodeAirDate: episode.airDate,
  episodeNumber: episode.episodeNumber,
  episodeStillPath: episode.stillPath,
  episodeTitle: episode.title,
  posterPath: tvSeries.posterPath,
  runtime: episode.runtime,
  seasonNumber: episode.seasonNumber,
  seriesId: tvSeries.id,
  slug: tvSeries.slug,
  title: tvSeries.title,
  userId,
  watchedAt,
  watchProviderLogoPath: watchProvider?.logoPath ?? null,
  watchProviderName: watchProvider?.name ?? null,
});

/**
 * The stored record: the item plus its table and index keys. An undated item
 * ("I don't remember") gets no gsi2 keys, so it's left out of gsi2: history,
 * date ranges and year stats never see it, while the base table and gsi1
 * (progress, counts) do.
 */
const toWatchedRecord = (item: WatchedItem) =>
  marshall({
    gsi1pk: seriesIndexPk(item.userId, item.seriesId),
    gsi1sk: episodeIndexSk(item.seasonNumber, item.episodeNumber),
    ...(!item.dateUnknown && {
      gsi2pk: historyIndexPk(item.userId),
      gsi2sk: item.watchedAt,
    }),
    pk: watchedPk(item.userId),
    sk: episodeSk(item.seriesId, item.seasonNumber, item.episodeNumber),
    ...item,
  });

/** The image URLs normalizeWatchedItem adds */
type WatchedItemImages = Pick<
  WatchedItem,
  'episodeStillImage' | 'posterImage' | 'watchProviderLogoImage'
>;

/** A watched item as read: the projected attributes plus the image URLs */
type ReadWatchedItem<K extends keyof WatchedItem> = Pick<WatchedItem, K> &
  WatchedItemImages;

type WatchedPage<K extends keyof WatchedItem> = Readonly<{
  items: ReadWatchedItem<K>[];
  nextCursor: string | null;
}>;

const normalizeWatchedItem = <T extends Partial<WatchedItem>>(
  item: T,
): T & WatchedItemImages => ({
  ...toWatchedItemResponse(item),
  episodeStillImage: item.episodeStillPath
    ? buildStillImageUrl(item.episodeStillPath)
    : undefined,
  posterImage: item.posterPath
    ? buildPosterImageUrl(item.posterPath)
    : item.posterImage,
  watchProviderLogoImage: item.watchProviderLogoPath
    ? buildLogoImageUrl(item.watchProviderLogoPath)
    : undefined,
});

/** One episode's watched item to write */
export type WatchedPut = WatchedWhen &
  Readonly<{
    episode: EpisodeForWatched;
    importId?: string;
    tvSeries: TvSeriesForWatched;
    userId: string;
    watchProvider?: WatchProvider | null;
  }>;

/** One episode's watched item, by its key */
export type WatchedKey = Readonly<{
  episodeNumber: number;
  seasonNumber: number;
  seriesId: number;
  userId: string;
}>;

const itemKey = (key: WatchedKey) => ({
  pk: watchedPk(key.userId),
  sk: episodeSk(key.seriesId, key.seasonNumber, key.episodeNumber),
});

// A batch write refuses two requests for one key: the first of each stays
const uniqueByKey = <T>(
  items: ReadonlyArray<T>,
  keyOf: (item: T) => WatchedKey,
) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const { pk, sk } = itemKey(keyOf(item));
    const composite = `${pk}#${sk}`;
    if (seen.has(composite)) {
      return false;
    }
    seen.add(composite);
    return true;
  });
};

/**
 * Writes the episodes' watched items (an episode twice in `items` once) and
 * returns them as written
 */
export const putWatchedItems = async (items: ReadonlyArray<WatchedPut>) => {
  const watchedItems = uniqueByKey(items, (item) => ({
    episodeNumber: item.episode.episodeNumber,
    seasonNumber: item.episode.seasonNumber,
    seriesId: item.tvSeries.id,
    userId: item.userId,
  })).map(createWatchedItem);

  await batchWrite(
    Resource.Watched.name,
    watchedItems.map((item) => ({
      PutRequest: { Item: toWatchedRecord(item) },
    })),
  );

  return watchedItems;
};

/** Deletes the episodes' watched items (a key twice in `keys` once) */
export const deleteWatchedItems = async (keys: ReadonlyArray<WatchedKey>) => {
  await batchWrite(
    Resource.Watched.name,
    uniqueByKey(keys, (key) => key).map((key) => ({
      DeleteRequest: { Key: marshall(itemKey(key)) },
    })),
  );
};

type SeriesInput = Readonly<{
  userId: string;
  tvSeriesId: number | string;
}>;

/**
 * Only these attributes are read (ProjectionExpression); the items then only
 * hold them. Leave out for full items.
 */
type AttributesOption<K extends keyof WatchedItem> = Readonly<{
  attributes?: ReadonlyArray<K>;
}>;

// A series' episodes are on gsi1 under `USER#<userId>#SERIES#<seriesId>`,
// sorted by `S<season>#E<episode>`
const seriesKeyCondition = (input: SeriesInput) => ({
  ExpressionAttributeValues: marshall({
    ':pk': seriesIndexPk(input.userId, input.tvSeriesId),
  }),
  IndexName: 'gsi1',
  KeyConditionExpression: 'gsi1pk = :pk',
});

/** The items of a read, normalised for a response (keys dropped, image URLs) */
const toReadWatchedItems = <K extends keyof WatchedItem>(
  items: ReadonlyArray<Record<string, AttributeValue>> | undefined,
): ReadWatchedItem<K>[] =>
  items?.map((item) =>
    normalizeWatchedItem(unmarshall(item) as Pick<WatchedItem, K>),
  ) ?? [];

/** Every page of a watched-item Query, normalised, in the Query's order */
const readAllPages = async <K extends keyof WatchedItem>(
  input: QueryInput,
): Promise<ReadWatchedItem<K>[]> => {
  const allItems: ReadWatchedItem<K>[] = [];
  for await (const page of queryPages(input)) {
    allItems.push(...toReadWatchedItems<K>(page.Items));
  }
  return allItems;
};

export const getAllWatchedForTvSeries = <
  K extends keyof WatchedItem = keyof WatchedItem,
>(
  input: SeriesInput & AttributesOption<K>,
) =>
  readAllPages<K>({
    ...seriesKeyCondition(input),
    ...(input.attributes && projection(input.attributes)),
    Limit: 1000,
    ScanIndexForward: false,
    TableName: Resource.Watched.name,
  });

/**
 * How many regular episodes (season 1 and up, so specials never count) of a
 * series a user watched: a base-table COUNT, eventually consistent (the
 * person page; the stream places shows with `getSeriesWatchSummary`, which
 * reads consistently).
 */
export const getWatchedCountForTvSeries = async (input: SeriesInput) => {
  return countQuery({
    ExpressionAttributeValues: marshall({
      ':from': seriesSkRange(input.tvSeriesId, 1).from,
      ':pk': watchedPk(input.userId),
      ':to': seriesSkRange(input.tvSeriesId, 1).to,
    }),
    KeyConditionExpression: 'pk = :pk AND sk BETWEEN :from AND :to',
    TableName: Resource.Watched.name,
  });
};

export type SeriesWatchSummary = Readonly<{
  /** Watched regular episodes (season 1 and up), as the count above */
  regularCount: number;
  /** Their codes (`S01E02`), every row with or without a date */
  regularCodes: ReadonlyArray<string>;
  /** Every watched item of the show, as the watch calendar counts them */
  items: ReadonlyArray<CalendarInput>;
}>;

/**
 * A watched item as the per-show summaries keep it (lib/rollups): enough for
 * the years list, progress and holes; parsed from the sort key plus three
 * attributes.
 */
export type CalendarInput = Readonly<{
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: number;
  runtime?: number;
  dateUnknown?: boolean;
}>;

/**
 * A watched item as the summaries read it: its sort key's series, season
 * and episode, plus three attributes
 */
type SummaryRow = Readonly<{
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  watchedAt?: number;
  runtime?: number;
  dateUnknown?: boolean;
}>;

/**
 * The summary rows of a base-table Query (a few attributes: reads are billed
 * by item size, not by what is projected, so this costs what a COUNT does),
 * consistent: the summaries are rebuilt from them right after a write
 */
async function* readSummaryRows(
  key: Pick<QueryInput, 'ExpressionAttributeValues' | 'KeyConditionExpression'>,
): AsyncGenerator<SummaryRow> {
  for await (const page of queryPages({
    ...key,
    ConsistentRead: true,
    ExpressionAttributeNames: {
      '#dateUnknown': 'dateUnknown',
      '#runtime': 'runtime',
      '#sk': 'sk',
      '#watchedAt': 'watchedAt',
    },
    ProjectionExpression: '#sk, #watchedAt, #runtime, #dateUnknown',
    TableName: Resource.Watched.name,
  })) {
    for (const raw of page.Items ?? []) {
      const item = unmarshall(raw) as Readonly<{
        sk: string;
        watchedAt?: number;
        runtime?: number;
        dateUnknown?: boolean;
      }>;
      const match = EPISODE_SK.exec(item.sk);
      if (match) {
        yield {
          dateUnknown: item.dateUnknown,
          episodeNumber: Number(match[3]),
          runtime: item.runtime,
          seasonNumber: Number(match[2]),
          seriesId: Number(match[1]),
          watchedAt: item.watchedAt,
        };
      }
    }
  }
}

/** A dated row as the watch calendar counts it; undefined without a date */
const toCalendarInput = (row: SummaryRow): CalendarInput | undefined =>
  typeof row.watchedAt === 'number'
    ? {
        dateUnknown: row.dateUnknown,
        episodeNumber: row.episodeNumber,
        runtime: row.runtime,
        seasonNumber: row.seasonNumber,
        watchedAt: row.watchedAt,
      }
    : undefined;

/**
 * What the watched stream needs to place a show in the lists and in the
 * watch calendar: the regular episode count and its items' dates and
 * runtimes. One consistent Query
 * of the show's items (`readSummaryRows`): it runs right after a write.
 */
export const getSeriesWatchSummary = async (
  input: SeriesInput,
): Promise<SeriesWatchSummary> => {
  const regularCodes: string[] = [];
  const items: CalendarInput[] = [];

  for await (const row of readSummaryRows({
    ExpressionAttributeValues: marshall({
      ':from': seriesSkRange(input.tvSeriesId, 0).from,
      ':pk': watchedPk(input.userId),
      ':to': seriesSkRange(input.tvSeriesId, 0).to,
    }),
    KeyConditionExpression: 'pk = :pk AND #sk BETWEEN :from AND :to',
  })) {
    if (row.seasonNumber > 0) {
      regularCodes.push(episodeCode(row));
    }
    const item = toCalendarInput(row);
    if (item) {
      items.push(item);
    }
  }

  return {
    items,
    regularCodes,
    regularCount: regularCodes.length,
  };
};

/**
 * Per show the user has watched items of: how many regular episodes (season
 * 1 and up; a show with specials only is there with 0), the newest
 * `watchedAt` of any of its items, and its items as the watch calendar
 * counts them; and the user's totals of regular episodes and their minutes
 * (the stored counters' true values). One consistent base-table Query of the
 * user's partition, four attributes (the nightly job).
 */
export const getWatchedBySeries = async (
  userId: string,
): Promise<
  Readonly<{
    bySeries: ReadonlyMap<
      number,
      Readonly<{
        regular: number;
        lastWatchedAt: number;
        items: ReadonlyArray<CalendarInput>;
      }>
    >;
    totals: Readonly<{ count: number; runtime: number }>;
  }>
> => {
  const bySeries = new Map<
    number,
    { regular: number; lastWatchedAt: number; items: CalendarInput[] }
  >();
  const totals = { count: 0, runtime: 0 };

  for await (const row of readSummaryRows(userKeyCondition(userId))) {
    const isRegular = row.seasonNumber > 0;
    const entry = bySeries.get(row.seriesId) ?? {
      items: [],
      lastWatchedAt: 0,
      regular: 0,
    };
    entry.lastWatchedAt = Math.max(entry.lastWatchedAt, row.watchedAt ?? 0);
    entry.regular += isRegular ? 1 : 0;
    const item = toCalendarInput(row);
    if (item) {
      entry.items.push(item);
    }
    bySeries.set(row.seriesId, entry);
    if (isRegular) {
      totals.count += 1;
      totals.runtime += row.runtime || 0;
    }
  }

  return { bySeries, totals };
};

/**
 * The watched episodes of one season (first 1000), as stored minus the keys.
 */
export const getWatchedForSeason = async <
  K extends keyof WatchedItem = keyof WatchedItem,
>(
  input: SeriesInput &
    AttributesOption<K> &
    Readonly<{
      seasonNumber: number;
    }>,
) => {
  const command = new QueryCommand({
    ...(input.attributes && projection(input.attributes)),
    ExpressionAttributeValues: marshall({
      ':pk': seriesIndexPk(input.userId, input.tvSeriesId),
      ':season': seasonIndexPrefix(input.seasonNumber),
    }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :season)',
    Limit: 1000,
    TableName: Resource.Watched.name,
  });

  const result = await client.send(command);

  return (
    result.Items?.map((item) =>
      toWatchedItemResponse(unmarshall(item) as Pick<WatchedItem, K>),
    ) ?? []
  );
};

// A user's dated items are on gsi2 under `USER#<userId>#WATCHED`, sorted by
// `watchedAt`; a range applies only when both ends are set
const datedKeyCondition = ({
  endDate,
  startDate,
  userId,
}: Readonly<{ userId: string; startDate?: Date; endDate?: Date }>) => {
  const range =
    startDate && endDate
      ? { ':end': endDate.getTime(), ':start': startDate.getTime() }
      : undefined;
  return {
    ExpressionAttributeValues: marshall({
      ':pk': historyIndexPk(userId),
      ...range,
    }),
    IndexName: 'gsi2',
    KeyConditionExpression: range
      ? 'gsi2pk = :pk AND gsi2sk BETWEEN :start AND :end'
      : 'gsi2pk = :pk',
  };
};

export const getWatched = async <
  K extends keyof WatchedItem = keyof WatchedItem,
>(
  input: AttributesOption<K> &
    Readonly<{
      userId: string;
      startDate?: Date;
      endDate?: Date;
      options?: Omit<PaginationOptions, 'sortBy'>;
    }>,
): Promise<WatchedPage<K>> => {
  const { limit = 20, cursor, sortDirection = 'desc' } = input.options ?? {};

  const result = await client.send(
    new QueryCommand({
      ...datedKeyCondition(input),
      ...(input.attributes && projection(input.attributes)),
      ExclusiveStartKey: decodeCursor(cursor),
      Limit: limit,
      ScanIndexForward: sortDirection === 'asc',
      TableName: Resource.Watched.name,
    }),
  );

  return {
    items: toReadWatchedItems<K>(result.Items),
    nextCursor: encodeCursor(result.LastEvaluatedKey),
  };
};

// Every watched item of a user, dated or not, is in the base table under
// `USER#<userId>` with an `SERIES#...` sort key
const userKeyCondition = (userId: string) => ({
  ExpressionAttributeValues: marshall({
    ':pk': watchedPk(userId),
    ':prefix': WATCHED_SK_PREFIX,
  }),
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
});

/**
 * All watched items in a date range (gsi2: dated items only, newest first),
 * or all time (base table: undated items too) without a range.
 */
export const getAllWatched = <K extends keyof WatchedItem = keyof WatchedItem>(
  input: AttributesOption<K> &
    Readonly<{
      userId: string;
      startDate?: Date;
      endDate?: Date;
    }>,
) =>
  readAllPages<K>({
    ...(input.startDate && input.endDate
      ? {
          ...datedKeyCondition(input),
          Limit: 1000,
          ScanIndexForward: false,
        }
      : userKeyCondition(input.userId)),
    ...(input.attributes && projection(input.attributes)),
    TableName: Resource.Watched.name,
  });

/**
 * Watched regular episodes in a date range (gsi2: dated items only), or all
 * time (base table: undated items count too) without a range. Specials
 * (season 0) never count, as in every stat (lib/stats `countsInStats`): a
 * filter, so the read costs what the plain COUNT did.
 */
export const getWatchedCount = async (
  input: Readonly<{
    userId: string;
    startDate?: Date;
    endDate?: Date;
  }>,
) => {
  const regularOnly = {
    ExpressionAttributeNames: { '#season': 'seasonNumber' },
    FilterExpression: '#season > :special',
  };

  const key =
    input.startDate && input.endDate
      ? datedKeyCondition(input)
      : userKeyCondition(input.userId);
  return countQuery({
    ...key,
    ...regularOnly,
    ExpressionAttributeValues: {
      ...key.ExpressionAttributeValues,
      ...marshall({ ':special': 0 }),
    },
    TableName: Resource.Watched.name,
  });
};

/** Who wrote a watched episode, and its date */
type WatchedEpisodeKey = Readonly<{
  /** The import (or sync chain) that wrote it; null: marked any other way */
  importId: string | null;
  watchedAt: number | null;
}>;

/**
 * The episode codes (`SERIES#<id>#S001#E001` sort keys) a user has of some
 * shows, each with who wrote it and when it was watched: one consistent
 * base-table Query per show (bounded concurrency).
 */
export const getWatchedEpisodeKeys = async (
  userId: string,
  seriesIds: ReadonlyArray<number>,
): Promise<ReadonlyMap<string, WatchedEpisodeKey>> => {
  const limit = createLimiter(BASE_QUERY_CONCURRENCY);
  const keys = new Map<string, WatchedEpisodeKey>();

  await Promise.all(
    [...new Set(seriesIds)].map((seriesId) =>
      limit(async () => {
        for await (const page of queryPages({
          ConsistentRead: true,
          ExpressionAttributeValues: marshall({
            ':pk': watchedPk(userId),
            ':prefix': seriesSkPrefix(seriesId),
          }),
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ProjectionExpression: 'sk, importId, watchedAt',
          TableName: Resource.Watched.name,
        })) {
          for (const item of page.Items ?? []) {
            if (item.sk?.S) {
              keys.set(item.sk.S, {
                importId: item.importId?.S ?? null,
                watchedAt: item.watchedAt?.N ? Number(item.watchedAt.N) : null,
              });
            }
          }
        }
      }),
    ),
  );

  return keys;
};

/** Marks per page of the media server read: the first page is all a light user costs */
const SCROBBLE_PAGE = 100;
/** At most this many marks (any source) are read for one status: 20 pages */
const SCROBBLE_SCAN_CAP = 2000;
/** At most this many media server marks are kept for the week */
const SCROBBLE_WEEK_CAP = 200;
/** The latest marks a status shows */
const RECENT_LIMIT = 5;
/**
 * The week's marks reach back 8 days: the viewer's "last seven days ending
 * today" starts at most 7 days and a DST hour before now in any time zone,
 * and only the browser knows which zone that is.
 */
const WEEK_MS = 8 * 24 * 60 * 60 * 1000;

type ScrobbleMark = Pick<
  WatchedItem,
  | 'episodeNumber'
  | 'episodeTitle'
  | 'seasonNumber'
  | 'seriesId'
  | 'title'
  | 'watchedAt'
>;

/** A mark as a status shows it (no empty episode title) */
const toRecent = ({
  episodeNumber,
  episodeTitle,
  seasonNumber,
  seriesId,
  title,
  watchedAt,
}: ScrobbleMark): RecentScrobble => ({
  episodeNumber,
  ...(episodeTitle && { episodeTitle }),
  seasonNumber,
  seriesId,
  title,
  watchedAt,
});

/**
 * The marks made through a media server or a sync (`watchProviderName`,
 * e.g. "Plex", "Netflix"), newest first, for a status: `recent` is the
 * latest 5 of them, `week` every one of the last 8 days (at most 200), from
 * one Query on gsi2 (a user's dated marks by time) with the provider as a
 * filter. The filter applies after a
 * page's `Limit`, so the Query keeps paging (100 marks a page, any source)
 * until a page ends before `since` (most users: one page), 200 media server
 * marks are in, or 2,000 marks were read: only a week with more hand marks
 * than that loses its oldest days. No lower key bound, so `recent` still
 * reaches back past a quiet week.
 */
export const getMarksByProvider = async ({
  importIdPrefix,
  providerName,
  userId,
}: Readonly<{
  /** Only marks whose import id starts with this (a sync's tag) */
  importIdPrefix?: string;
  providerName: string;
  userId: string;
}>): Promise<
  Readonly<{
    recent: ReadonlyArray<RecentScrobble>;
    week: ReadonlyArray<RecentScrobble>;
  }>
> => {
  const since = Date.now() - WEEK_MS;
  const marks: ScrobbleMark[] = [];
  let scanned = 0;
  for await (const page of queryPages({
    ExpressionAttributeNames: {
      '#e': 'episodeNumber',
      '#et': 'episodeTitle',
      ...(importIdPrefix && { '#i': 'importId' }),
      '#p': 'watchProviderName',
      '#s': 'seasonNumber',
      '#sid': 'seriesId',
      '#t': 'title',
      '#w': 'watchedAt',
    },
    ExpressionAttributeValues: marshall({
      ':pk': historyIndexPk(userId),
      ':provider': providerName,
      ...(importIdPrefix && { ':importIdPrefix': importIdPrefix }),
    }),
    FilterExpression: importIdPrefix
      ? '#p = :provider AND begins_with(#i, :importIdPrefix)'
      : '#p = :provider',
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk',
    Limit: SCROBBLE_PAGE,
    ProjectionExpression: '#sid, #t, #s, #e, #et, #w',
    ScanIndexForward: false,
    TableName: Resource.Watched.name,
  })) {
    for (const item of page.Items ?? []) {
      marks.push(unmarshall(item) as ScrobbleMark);
    }
    scanned += page.ScannedCount ?? 0;
    const reached = Number(page.LastEvaluatedKey?.gsi2sk?.N ?? 0);
    if (
      reached < since ||
      scanned >= SCROBBLE_SCAN_CAP ||
      marks.length >= SCROBBLE_WEEK_CAP
    ) {
      break;
    }
  }

  return {
    recent: marks.slice(0, RECENT_LIMIT).map(toRecent),
    week: marks
      .filter((mark) => mark.watchedAt >= since)
      .slice(0, SCROBBLE_WEEK_CAP)
      .map(toRecent),
  };
};
