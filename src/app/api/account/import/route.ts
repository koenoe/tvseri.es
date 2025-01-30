import { isValid, parse } from 'date-fns';
import { diceCoefficient } from 'dice-coefficient';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import slugify from 'slugify';
import wordsToNumbers from 'words-to-numbers';

import { cachedTvSeries, cachedTvSeriesSeason } from '@/app/cached';
import auth from '@/auth';
import { markWatchedInBatch } from '@/lib/db/watched';
import { fetchWatchProviders } from '@/lib/tmdb';
import { searchTvSeries } from '@/lib/tmdb';
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
const DICE_COEFFICIENT_THRESHOLD = 0.75;

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
  const textLower = text.toLowerCase().trim();
  const ordinalRegex = /(\d+)(?:st|nd|rd|th)/i;
  const match = textLower.match(ordinalRegex);
  return match ? parseInt(match[1], 10) : null;
}

function parseWrittenNumber(text: string): number | null {
  const textLower = text.toLowerCase().trim();

  const digitMatch = textLower.match(/\d+/);
  if (digitMatch) {
    const parsed = parseInt(digitMatch[0], 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }

  const numberFromWord = wordsToNumbers(textLower);
  if (typeof numberFromWord === 'string') {
    const parsed = parseInt(numberFromWord, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }
  return numberFromWord && numberFromWord > 0 ? numberFromWord : null;
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
    /(?:Season|Seizoen|Deel|Hoofdstuk|Boek|Series|Part|Volume|Chapter|Tiger King|Stranger Things)\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)|[A-Z][a-z]+(?:st|nd|rd|th)\s+(?:Season|Series)/i;
  const match = normalizedStr.match(seasonRegex);

  if (match) {
    const numberPart = match[0]
      .replace(
        /Season|Seizoen|Deel|Hoofdstuk|Boek|Series|Part|Volume|Chapter/i,
        '',
      )
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
      .replace(/Chapter|Episode|Aflevering/i, '')
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
    // Try to get season from cache first
    const cacheKey = `${tvSeries.id}-${seasonNumber}`;
    let season = seasonCache.get(cacheKey);

    // Fetch and cache if not found
    if (season === undefined) {
      season = await cachedTvSeriesSeason(tvSeries.id, seasonNumber);
      seasonCache.set(cacheKey, season ?? null);
    }

    // Early return if no season or episodes
    if (!season?.episodes?.length) {
      return null;
    }

    // Try to match by episode number first (fastest and most reliable)
    const episodeNumber = parseEpisodeNumber(episodeStr);
    if (episodeNumber) {
      const matchOnNumber = season.episodes.find(
        (episode) => episode.episodeNumber === episodeNumber,
      );
      if (matchOnNumber) {
        return matchOnNumber;
      }
    }

    // Fall back to title matching if episode number not found
    const slugifiedEpisodeStr = slugify(String(episodeStr), {
      lower: true,
      strict: true,
      trim: true,
    });

    return (
      season.episodes.find((episode) => {
        const slugifiedTitle = slugify(episode.title, {
          lower: true,
          strict: true,
          trim: true,
        });

        // 1. Check for exact match first
        if (slugifiedTitle === slugifiedEpisodeStr) {
          return true;
        }

        // 2. Check for full containment
        if (
          slugifiedTitle.includes(slugifiedEpisodeStr) ||
          slugifiedEpisodeStr.includes(slugifiedTitle)
        ) {
          return true;
        }

        // 3. Fall back to fuzzy matching
        return (
          diceCoefficient(slugifiedTitle, slugifiedEpisodeStr) >
          DICE_COEFFICIENT_THRESHOLD
        );
      }) ?? null
    );
  } catch (error) {
    console.error('Error finding episode:', error);
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as BodyPayload;
  if (!body) {
    return Response.json({ error: 'No payload found' }, { status: 400 });
  }

  const { user } = await auth();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
              // Normalize the title by removing common problematic strings and whitespace
              const normalizedTitle = String(item.title)
                .toLowerCase()
                // Some TV titles have (TV) in the title which doesn't work well with TMDB search
                .replace('(tv)', '')
                // TMDB search doesn't like the UK and US abbreviations
                .replace(/\(u\.k\.\)/g, '(uk)')
                .replace(/\(u\.s\.\)/g, '(us)')
                .trim();

              // Try to get series from cache first
              let tvSeries = tvSeriesCache.get(normalizedTitle);

              if (tvSeries === undefined) {
                const tvSeriesResults = await searchTvSeries(normalizedTitle);

                // Handle cases where multiple series might have the same title (e.g., "The Staircase")
                const exactMatches = [];
                let fuzzyMatch = null;

                // Sort results into exact matches and potential fuzzy matches
                for (const result of tvSeriesResults) {
                  const slugifiedTitle = slugify(normalizedTitle, {
                    lower: true,
                    strict: true,
                    trim: true,
                  });
                  const slugifiedResultTitle = slugify(result.title, {
                    lower: true,
                    strict: true,
                    trim: true,
                  });

                  // If we find an exact match, add it to our collection of exact matches
                  if (slugifiedTitle === slugifiedResultTitle) {
                    exactMatches.push(result);
                    continue;
                  }

                  // Store the first fuzzy match we find as a fallback
                  if (!fuzzyMatch) {
                    // Check if one title contains the other
                    if (
                      slugifiedResultTitle.includes(slugifiedTitle) ||
                      slugifiedTitle.includes(slugifiedResultTitle)
                    ) {
                      fuzzyMatch = result;
                      continue;
                    }

                    // Last resort: check similarity using Dice coefficient
                    if (
                      diceCoefficient(slugifiedTitle, slugifiedResultTitle) >
                      DICE_COEFFICIENT_THRESHOLD
                    ) {
                      fuzzyMatch = result;
                    }
                  }
                }

                // If we have exact matches, try each one until we find one with the episode we're looking for
                const seasonNumber = parseSeasonNumber(item.season);

                if (exactMatches.length > 0) {
                  for (const match of exactMatches) {
                    const possibleSeries = await cachedTvSeries(match.id);

                    // Try to find the episode in this series
                    const episode = await findEpisode(
                      item.episode,
                      possibleSeries!,
                      seasonNumber,
                    );

                    // If we found the episode, this is the correct series
                    if (episode) {
                      tvSeries = possibleSeries;
                      tvSeriesCache.set(normalizedTitle, tvSeries!);
                      break;
                    }
                  }
                }

                // If no exact matches worked, try our fuzzy match as a last resort
                if (!tvSeries && fuzzyMatch) {
                  tvSeries = await cachedTvSeries(fuzzyMatch.id);
                  tvSeriesCache.set(normalizedTitle, tvSeries!);
                }

                if (!tvSeries && tvSeriesResults.length > 0) {
                  tvSeries = await cachedTvSeries(tvSeriesResults[0].id);
                  tvSeriesCache.set(normalizedTitle, tvSeries!);
                }
              }

              // Handle case where we couldn't find any matching series
              if (!tvSeries) {
                erroredItems.push({
                  item,
                  error: `Could not find series: "${normalizedTitle}"`,
                });
                tvSeriesCache.set(normalizedTitle, null);
                continue;
              }

              // Try to find the specific episode
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

              // Find matching watch provider if one was specified
              const watchProvider =
                providers.find(
                  (p) =>
                    p.name.toLowerCase() === item.watchProvider?.toLowerCase(),
                ) || null;

              // Validate and parse the watch date
              const watchedAt = parseDate(item.date);
              if (!watchedAt) {
                erroredItems.push({
                  item,
                  error: `Invalid date format: "${item.date}"`,
                });
                continue;
              }

              // Add the successfully processed item
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
