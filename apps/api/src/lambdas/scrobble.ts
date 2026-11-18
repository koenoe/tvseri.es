import { PLEX_WATCH_PROVIDER } from '@tvseri.es/constants';
import {
  type Episode,
  episodeCode,
  type PlexMetadata,
  PlexMetadataSchema,
  type ScrobbleEvent,
  type TmdbExternalSource,
  type TvSeries,
} from '@tvseri.es/schemas';
import type {
  Context,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';
import * as v from 'valibot';

import { afterWatching } from '@/lib/db/prefs';
import { markWatched } from '@/lib/db/watched';
import { eachRecordInTime } from '@/lib/sqs';
import {
  fetchTvSeriesBase,
  fetchTvSeriesEpisode,
  findByExternalId,
  searchTvSeries,
} from '@/lib/tmdb';

type EpisodeWithTvSeriesId = Episode & { tvSeriesId: number };

type ExternalIds = Record<Partial<TmdbExternalSource>, string | undefined>;

type Metadata = Readonly<{
  seriesTitle?: string;
  episodeNumber?: number;
  seasonNumber?: number;
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
    externalIds: Object.values(externalIds).some(Boolean)
      ? externalIds
      : undefined,
    seasonNumber: metadata.parentIndex,
    seriesTitle: metadata.grandparentTitle,
    year: metadata.year,
  };
}

const processScrobble = async (record: SQSRecord) => {
  const payload = JSON.parse(record.body) as ScrobbleEvent;

  // Only Plex is handled; the webhook route already refuses other providers
  if (!payload.metadata.plex) {
    return;
  }

  // The route validated it; a message it didn't (from before the check, or
  // a redrive) is dropped: retrying can't make it valid
  const plex = v.safeParse(PlexMetadataSchema, payload.metadata.plex);
  if (!plex.success) {
    console.error(
      `Invalid Plex metadata in ${record.messageId}, skipping | User: ${payload.userId}`,
    );
    return;
  }

  const metadata = normalizePlexMetadata(plex.output);

  let episode: Episode | undefined;
  let tvSeries: TvSeries | undefined;

  if (metadata.externalIds) {
    // imdb first, tvdb only when imdb has no match: most scrobbles resolve
    // with one TMDB call
    for (const source of ['imdb_id', 'tvdb_id'] as const) {
      const id = metadata.externalIds[source];
      if (!id) {
        continue;
      }

      const result = await findByExternalId({
        externalId: id,
        externalSource: source,
      });
      const externalEpisode = result?.episodes[0] as
        | EpisodeWithTvSeriesId
        | undefined;

      if (externalEpisode) {
        episode = externalEpisode;
        // List fields only: no preferred images / dominant colour needed
        tvSeries = await fetchTvSeriesBase(externalEpisode.tvSeriesId);
        break;
      }
    }
  }

  // Else a fuzzy search (it needs the title and both numbers)
  const { episodeNumber, seasonNumber, seriesTitle } = metadata;
  if (
    !episode &&
    seriesTitle &&
    seasonNumber !== undefined &&
    episodeNumber !== undefined
  ) {
    const fuzzyResult = await searchTvSeries(seriesTitle, {
      year: metadata.year,
    });

    if (fuzzyResult.length > 0) {
      const tvSeriesFromResult = fuzzyResult[0]!;
      const episodeFromResult = await fetchTvSeriesEpisode(
        tvSeriesFromResult.id,
        seasonNumber,
        episodeNumber,
      );

      if (episodeFromResult) {
        episode = episodeFromResult;
        tvSeries = tvSeriesFromResult;
      }
    }
  }

  if (!episode || !tvSeries) {
    const reason = !metadata.externalIds
      ? 'No external IDs found in payload, and no fuzzy result'
      : 'No episode found via external IDs or fuzzy search';
    // The validated fields only: a message from before the route checked it
    // holds everything the media server sent
    console.error(
      `${reason}, skipping`,
      JSON.stringify({ plex: plex.output, userId: payload.userId }),
    );
    return;
  }

  const watchedItem = await markWatched({
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
    watchProvider: PLEX_WATCH_PROVIDER,
  });
  await afterWatching([watchedItem]);

  console.log(
    `[SUCCESS] Plex | ${tvSeries.title} - ${episodeCode(episode)} "${episode.title}" | User: ${payload.userId}`,
  );
};

// One scrobble's worst case: TMDB reads with their retries (~13.5 s)
const SCROBBLE_RESERVE_MS = 15_000;

/**
 * Each message is handled on its own, so one failing scrobble is retried
 * (and eventually sent to the DLQ) without re-running the others.
 */
export const handler = (
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> =>
  eachRecordInTime(
    event,
    context,
    SCROBBLE_RESERVE_MS,
    processScrobble,
    'SCROBBLE',
  );
