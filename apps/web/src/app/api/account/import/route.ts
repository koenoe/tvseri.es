import type {
  EpisodeForWatched,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';
import type { NextRequest } from 'next/server';

import { cachedTvSeries, cachedTvSeriesSeason } from '@/app/cached';
import auth from '@/auth';
import { fetchWatchProviders, markWatchedInBatch } from '@/lib/api';
import { getRegionFromHeaders } from '@/lib/geo';
import { createEpisodeMatcher } from '@/lib/import/matcher';
import { toNdjsonLine } from '@/lib/import/ndjson';
import { cachedSearchTvSeries } from '@/lib/import/searchSeries';
import {
  type ImportError,
  type ImportEvent,
  type ImportRow,
  isImportRows,
  toImportError,
} from '@/lib/import/types';

const BATCH_SIZE = 25;

type WatchedItem = {
  episode: EpisodeForWatched;
  tvSeries: TvSeries;
  userId: string;
  watchedAt: number;
  watchProvider?: WatchProvider | null;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

export async function POST(req: NextRequest) {
  const { user, accessToken } = await auth(req);
  if (!user || !accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  if (!isImportRows(body)) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { signal } = req;
  const providers = await fetchWatchProviders(
    user.country ?? getRegionFromHeaders(req.headers),
  );
  const matcher = createEpisodeMatcher({
    getSeason: cachedTvSeriesSeason,
    getTvSeries: cachedTvSeries,
    searchTvSeries: cachedSearchTvSeries,
  });

  const importBatch = async (
    batch: ReadonlyArray<ImportRow>,
  ): Promise<ImportEvent> => {
    const watchedItems: WatchedItem[] = [];
    const watchedRows: ImportRow[] = [];
    const errors: ImportError[] = [];

    for (const row of batch) {
      try {
        const result = await matcher.match(row);
        if ('error' in result) {
          errors.push(toImportError(row, result.error));
          continue;
        }
        const { episode, seasonNumber, tvSeries } = result;
        const watchProvider =
          providers.find(
            (p) => p.name?.toLowerCase() === row.watchProvider?.toLowerCase(),
          ) ?? null;

        watchedRows.push(row);
        watchedItems.push({
          episode: {
            airDate: episode.airDate,
            episodeNumber: episode.episodeNumber,
            runtime: episode.runtime,
            seasonNumber,
            stillPath: episode.stillPath,
            title: episode.title,
          },
          tvSeries,
          userId: user.id,
          watchedAt: row.watchedAt,
          watchProvider,
        });
      } catch (error) {
        errors.push(
          toImportError(row, `Processing error: ${errorMessage(error)}`),
        );
      }
    }

    if (watchedItems.length === 0) {
      return { errors, status: 'progress', successCount: 0 };
    }
    try {
      await markWatchedInBatch({
        accessToken,
        items: watchedItems,
        userId: user.id,
      });
      return { errors, status: 'progress', successCount: watchedItems.length };
    } catch (error) {
      const message = `Database error: ${errorMessage(error)}`;
      errors.push(...watchedRows.map((row) => toImportError(row, message)));
      return { errors, status: 'progress', successCount: 0 };
    }
  };

  const encoder = new TextEncoder();
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (offset >= body.length || signal.aborted) {
        controller.close();
        return;
      }
      const batch = body.slice(offset, offset + BATCH_SIZE);
      offset += BATCH_SIZE;
      const event = await importBatch(batch).catch(
        (error): ImportEvent => ({
          error: errorMessage(error),
          status: 'error',
        }),
      );
      controller.enqueue(encoder.encode(toNdjsonLine(event)));
      if (event.status === 'error') {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/x-ndjson; charset=utf-8',
    },
  });
}
