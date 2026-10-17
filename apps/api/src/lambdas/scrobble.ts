import type {
  Episode,
  PlexMetadata,
  ScrobbleEvent,
  TmdbExternalSource,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';
import type { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';

import { markWatched } from '@/lib/db/watched';
import {
  fetchTvSeriesBase,
  fetchTvSeriesEpisode,
  findByExternalId,
  searchTvSeries,
} from '@/lib/tmdb';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';

type EpisodeWithTvSeriesId = Episode & { tvSeriesId: number };

type ExternalIds = Record<Partial<TmdbExternalSource>, string | undefined>;

type Metadata = Readonly<{
  episodeTitle: string;
  seasonTitle: string;
  seriesTitle: string;
  episodeNumber: number;
  seasonNumber: number;
  year?: number;
  externalIds?: ExternalIds;
}>;

function normalizePlexMetadata(metadata: PlexMetadata): Metadata {
  const extractExternalId = (guids: PlexMetadata['Guid'], prefix: string) => {
    return guids
      ?.find((guid) => guid.id.startsWith(`${prefix}://`))
      ?.id.replace(`${prefix}://`, '');
  };

  const externalIds = {
    imdb_id: extractExternalId(metadata.Guid, 'imdb'),
    tmdb_id: extractExternalId(metadata.Guid, 'tmdb'),
    tvdb_id: extractExternalId(metadata.Guid, 'tvdb'),
  } as unknown as ExternalIds;

  return {
    episodeNumber: metadata.index,
    episodeTitle: metadata.title,
    externalIds: Object.values(externalIds).some(Boolean)
      ? externalIds
      : undefined,
    seasonNumber: metadata.parentIndex,
    seasonTitle: metadata.parentTitle,
    seriesTitle: metadata.grandparentTitle,
    year: metadata.year,
  };
}

const processScrobble = async (record: SQSRecord) => {
  const payload = JSON.parse(record.body) as ScrobbleEvent;

  // Note: skipping non-Plex scrobbles for now
  // even though it should never happen as we filter them out in the webhook already
  if (!payload.metadata.plex) {
    return;
  }

  const watchProvider = {
    id: 0,
    logo: '',
    logoPath: '/vLZKlXUNDcZR7ilvfY9Wr9k80FZ.jpg',
    name: 'Plex',
  } as WatchProvider;

  const metadata = normalizePlexMetadata(payload.metadata.plex);

  // Try to find episode by external IDs first
  let episode: Episode | undefined;
  let tvSeries: TvSeries | undefined;

  if (metadata.externalIds) {
    const searches = (['imdb_id', 'tvdb_id'] as const).map((source) => {
      const id = metadata.externalIds?.[source];
      return id
        ? findByExternalId({
            externalId: id,
            externalSource: source,
          })
        : Promise.resolve(undefined);
    });

    const externalEpisode = (await Promise.all(searches)).find(
      (r) => r?.episodes.length,
    )?.episodes[0] as EpisodeWithTvSeriesId | undefined;

    if (externalEpisode) {
      episode = externalEpisode;
      // List fields only: no preferred images / dominant colour needed
      tvSeries = await fetchTvSeriesBase(externalEpisode.tvSeriesId);
    }
  }

  // If no episode found via external IDs or no external IDs, try fuzzy search
  if (!episode) {
    const fuzzyResult = await searchTvSeries(metadata.seriesTitle, {
      year: metadata.year,
    });

    if (fuzzyResult.length > 0) {
      const tvSeriesFromResult = fuzzyResult[0]!;
      const episodeFromResult = await fetchTvSeriesEpisode(
        tvSeriesFromResult.id,
        metadata.seasonNumber,
        metadata.episodeNumber,
      );

      if (episodeFromResult) {
        episode = episodeFromResult;
        tvSeries = tvSeriesFromResult;
      }
    }
  }

  // If still no episode found, skip
  if (!episode || !tvSeries) {
    const reason = !metadata.externalIds
      ? 'No external IDs found in payload, and no fuzzy result'
      : 'No episode found via external IDs or fuzzy search';
    console.error(`${reason}, skipping`, JSON.stringify(payload));
    return;
  }

  // Mark as watched and log success
  await markWatched({
    episode: {
      airDate: episode.airDate,
      episodeNumber: episode.episodeNumber,
      runtime: episode.runtime,
      seasonNumber: episode.seasonNumber,
      stillPath: episode.stillPath,
      title: episode.title,
    },
    tvSeries: tvSeries,
    userId: payload.userId,
    // When the scrobble was queued, not processed: retries, duplicate
    // deliveries and DLQ redrives keep the real date (and stay idempotent)
    watchedAt: Number(record.attributes.SentTimestamp),
    watchProvider,
  });

  console.log(
    `[SUCCESS] Plex | ${tvSeries.title} - ${formatSeasonAndEpisode({ episodeNumber: episode.episodeNumber, seasonNumber: episode.seasonNumber })} "${episode.title}" | User: ${payload.userId}`,
  );
};

/**
 * Each message is handled on its own and reported back as a batch item failure
 * if it throws, so one failing scrobble is retried (and eventually sent to the
 * DLQ) without re-running the others.
 */
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const record of event.Records) {
    try {
      await processScrobble(record);
    } catch (error) {
      console.error(
        `Error processing scrobble event ${record.messageId}:`,
        error,
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
