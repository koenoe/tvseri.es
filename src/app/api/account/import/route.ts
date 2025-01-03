import { isValid, parse } from 'date-fns';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { cachedTvSeries } from '@/lib/cached';
import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { markWatchedInBatch } from '@/lib/db/watched';
import { fetchWatchProviders } from '@/lib/tmdb';
import { searchTvSeries, fetchTvSeriesSeason } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';
import { type TvSeries, type Episode, type Season } from '@/types/tv-series';
import { type WatchProvider } from '@/types/watch-provider';

type CsvItem = Readonly<{
  title: string;
  date: string;
  season: string;
  episode: string;
  watchProvider?: string;
}>;

type BodyPayload = CsvItem[];

const tvSeriesCache = new Map<string, TvSeries | null>();
const seasonCache = new Map<string, Season | null>();

const BATCH_SIZE = 25;

const WRITTEN_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
};

function parseDate(dateStr: string): number | null {
  const formats = [
    'dd/MM/yyyy', // 31/12/2024
    'MM/dd/yyyy', // 12/31/2024
    'yyyy-MM-dd', // 2024-12-31
    'dd-MM-yyyy', // 31-12-2024
    'dd.MM.yyyy', // 31.12.2024
    'dd MMM yyyy', // 31 Dec 2024
    'dd MMMM yyyy', // 31 December 2024
  ];

  for (const format of formats) {
    const date = parse(dateStr, format, new Date());
    if (isValid(date)) {
      return date.getTime();
    }
  }

  return null;
}

function parseOrdinalNumber(text: string): number | null {
  const ordinalRegex = /(\d+)(?:st|nd|rd|th)/i;
  const match = text.match(ordinalRegex);
  return match ? parseInt(match[1], 10) : null;
}

function parseWrittenNumber(text: string): number | null {
  const textLower = text.toLowerCase().trim();

  const digitMatch = textLower.match(/\d+/);
  if (digitMatch) {
    return parseInt(digitMatch[0], 10);
  }

  for (const [word, num] of Object.entries(WRITTEN_NUMBERS)) {
    if (textLower.includes(word)) {
      return num;
    }
  }

  return null;
}

function parseSeasonNumber(seasonStr: string | number): number {
  if (typeof seasonStr === 'number' && !isNaN(seasonStr)) {
    return Math.max(1, seasonStr);
  }

  const normalizedStr = String(seasonStr).toLowerCase().trim();
  if (
    !normalizedStr ||
    normalizedStr.includes('limited series') ||
    normalizedStr.includes('miniseries')
  ) {
    return 1;
  }

  const seasonRegex =
    /(?:Season|Seizoen|Deel|Hoofdstuk|Boek|Series|Part|Volume)\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)|[A-Z][a-z]+(?:st|nd|rd|th) (Season|Series)/i;
  const match = normalizedStr.match(seasonRegex);

  if (match) {
    const numberPart = match[0]
      .replace(/Season|Seizoen|Deel|Hoofdstuk|Boek|Series|Part|Volume/i, '')
      .trim();
    const parsedNum =
      parseWrittenNumber(numberPart) || parseOrdinalNumber(numberPart);
    return parsedNum && parsedNum > 0 ? parsedNum : 1;
  }

  return 1;
}

function parseEpisodeNumber(episodeStr: string | number): number | null {
  if (typeof episodeStr === 'number' && !isNaN(episodeStr)) {
    return episodeStr;
  }

  const normalizedStr = String(episodeStr).toLowerCase().trim();
  const episodeRegex =
    /(?:Chapter|Episode|Aflevering)[.\s#-]*(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)|[A-Z][a-z]+(?:st|nd|rd|th) Episode/i;
  const match = normalizedStr.match(episodeRegex);

  if (match) {
    const numberPart = match[0]
      .replace(/Episode|Chapter|Aflevering/i, '')
      .trim();
    const parsedNum =
      parseWrittenNumber(numberPart) || parseOrdinalNumber(numberPart);
    return parsedNum && parsedNum > 0 ? parsedNum : null;
  }

  return null;
}

async function findEpisode(
  episodeStr: string,
  tvSeries: TvSeries,
  seasonNumber: number,
): Promise<Episode | null> {
  try {
    const cacheKey = `${tvSeries.id}-${seasonNumber}`;
    let season = seasonCache.get(cacheKey);
    if (season === undefined) {
      season = await fetchTvSeriesSeason(tvSeries.id, seasonNumber);
      seasonCache.set(cacheKey, season ?? null);
    }

    if (!season || !season.episodes) {
      return null;
    }

    const matchOnTitle = season.episodes.find(
      (episode) =>
        episode.title.toLowerCase().trim() ===
        String(episodeStr).toLowerCase().trim(),
    );

    if (matchOnTitle) {
      return matchOnTitle;
    }

    const episodeNumber = parseEpisodeNumber(episodeStr);
    if (episodeNumber) {
      const matchOnNumber = season.episodes.find(
        (episode) => episode.episodeNumber === episodeNumber,
      );
      return matchOnNumber ?? null;
    }

    return null;
  } catch (_) {
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as BodyPayload;
  if (!body) {
    return Response.json({ error: 'No payload found' }, { status: 400 });
  }

  const encryptedSessionId = (await cookies()).get('sessionId')?.value;

  if (!encryptedSessionId) {
    return Response.json({ error: 'No session' }, { status: 401 });
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  const user = await findUser({ userId: session.userId });

  if (!user) {
    return Response.json(
      { error: 'No valid user found in session' },
      { status: 401 },
    );
  }

  const signal = req.signal;

  const region = (await headers()).get('cloudfront-viewer-country') || 'US';
  const providers = await fetchWatchProviders(region);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < body.length; i += BATCH_SIZE) {
          if (signal.aborted) {
            controller.close();
            return;
          }

          let successCount = 0;
          const batch = body.slice(i, i + BATCH_SIZE);
          const watchedItems: Array<{
            userId: string;
            tvSeries: TvSeries;
            seasonNumber: number;
            episodeNumber: number;
            runtime: number;
            watchProvider?: WatchProvider | null;
            watchedAt: number;
          }> = [];
          const erroredItems: Array<{ item: CsvItem; error: string }> = [];

          for (const item of batch) {
            if (signal.aborted) {
              controller.close();
              return;
            }

            try {
              const normalizedTitle = String(item.title).toLowerCase().trim();
              let tvSeries = tvSeriesCache.get(normalizedTitle);
              if (tvSeries === undefined) {
                const tvSeriesResults = await searchTvSeries(normalizedTitle);
                const matchFromResults = tvSeriesResults.find(
                  (result) =>
                    result.title.toLowerCase().trim() === normalizedTitle,
                );
                const result = matchFromResults ?? tvSeriesResults[0] ?? null;
                if (result) {
                  tvSeries = await cachedTvSeries(result.id);
                }
                tvSeriesCache.set(item.title, tvSeries!);
              }

              if (!tvSeries) {
                erroredItems.push({
                  item,
                  error: `Could not find series: "${item.title}"`,
                });
                continue;
              }

              const seasonNumber = parseSeasonNumber(item.season);
              const episode = await findEpisode(
                item.episode,
                tvSeries,
                seasonNumber,
              );

              if (!episode) {
                erroredItems.push({
                  item,
                  error: `Could not find episode: "${item.episode}"`,
                });
                continue;
              }

              const watchProvider =
                providers.find(
                  (p) =>
                    p.name.toLowerCase() === item.watchProvider?.toLowerCase(),
                ) || null;

              const watchedAt = parseDate(item.date);
              if (!watchedAt) {
                erroredItems.push({
                  item,
                  error: `Invalid date format: "${item.date}"`,
                });
                continue;
              }

              watchedItems.push({
                userId: user.id,
                tvSeries,
                seasonNumber,
                episodeNumber: episode.episodeNumber,
                runtime: episode.runtime,
                watchProvider,
                watchedAt,
              });
            } catch (error) {
              erroredItems.push({
                item,
                error: `Processing error: ${(error as Error).message}`,
              });
            }
          }

          if (watchedItems.length > 0) {
            try {
              await markWatchedInBatch(watchedItems);
              successCount += watchedItems.length;
            } catch (error) {
              erroredItems.push(
                ...watchedItems.map((item) => ({
                  item: {
                    title: item.tvSeries.title,
                    date: item.watchedAt.toString(),
                    season: item.seasonNumber.toString(),
                    episode: item.episodeNumber.toString(),
                  },
                  error: `Database error: ${(error as Error).message}`,
                })),
              );
            }
          }

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                status: 'progress',
                successCount,
                errors: erroredItems,
              }) + '\n',
            ),
          );
        }

        controller.close();
      } catch (error) {
        if (!signal.aborted) {
          controller.error(error);
        }
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  });
}
