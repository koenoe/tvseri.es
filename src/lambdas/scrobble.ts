import { type SQSHandler, type SQSEvent } from 'aws-lambda';

import { cachedTvSeries } from '@/lib/cached';
import { markWatched } from '@/lib/db/watched';
import { findByExternalId } from '@/lib/tmdb';
import { type WatchProvider } from '@/types/watch-provider';

type JellyfinMetadata = unknown;

export type PlexMetadata = Readonly<{
  librarySectionType: string;
  ratingKey: string;
  key: string;
  parentRatingKey: string;
  grandparentRatingKey: string;
  guid: string;
  Guid?: ReadonlyArray<{ id: string }>;
  librarySectionID: number;
  type: string;
  title: string;
  grandparentKey: string;
  parentKey: string;
  grandparentTitle: string;
  parentTitle: string;
  summary?: string;
  index: number;
  parentIndex: number;
  ratingCount?: number;
  thumb?: string;
  art?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  grandparentArt?: string;
  addedAt: number;
  updatedAt: number;
  year?: number;
}>;

type Metadata = Readonly<{
  episodeTitle: string;
  seasonTitle: string;
  seriesTitle: string;
  episodeNumber: number;
  seasonNumber: number;
  year?: number;
  externalIds: {
    tvdb?: string;
    tmdb?: string;
    imdb?: string;
  };
}>;

type ScrobbleMetadata =
  | { plex: PlexMetadata; jellyfin?: never }
  | { plex?: never; jellyfin: JellyfinMetadata };

export type ScrobbleEvent = Readonly<{
  userId: string;
  metadata: ScrobbleMetadata;
}>;

function normalizePlexMetadata(metadata: PlexMetadata): Metadata {
  const extractExternalId = (guids: PlexMetadata['Guid'], prefix: string) => {
    return guids
      ?.find((guid) => guid.id.startsWith(`${prefix}://`))
      ?.id.replace(`${prefix}://`, '');
  };

  const externalIds = {
    tvdb: extractExternalId(metadata.Guid, 'tvdb'),
    tmdb: extractExternalId(metadata.Guid, 'tmdb'),
    imdb: extractExternalId(metadata.Guid, 'imdb'),
  };

  return {
    episodeTitle: metadata.title,
    seasonTitle: metadata.parentTitle,
    seriesTitle: metadata.grandparentTitle,
    episodeNumber: metadata.index,
    seasonNumber: metadata.parentIndex,
    year: metadata.year,
    externalIds,
  };
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      const payload = JSON.parse(record.body) as ScrobbleEvent;

      // Note: skipping non-Plex scrobbles for now
      // even though it should never happen as we filter them out in the webhook already
      if (!payload.metadata.plex) {
        continue;
      }

      const metadata = normalizePlexMetadata(payload.metadata.plex);

      const { tvdb: tvdbId } = metadata.externalIds;
      if (!tvdbId) {
        console.error('No `tvdbId` found, skipping', JSON.stringify(payload));
        continue;
      }

      const externalIdResults = await findByExternalId({
        externalId: tvdbId,
        externalSource: 'tvdb_id',
      });

      const episode = externalIdResults.episodes[0];
      if (!episode) {
        // TODO: fuzzy matching by title, year etc.
        console.error('No episode found, skipping', JSON.stringify(payload));
        continue;
      }

      const tvSeries = await cachedTvSeries(episode.tvSeriesId);
      // FIXME: make it prettier, lol
      const watchProvider = {
        id: 0,
        name: 'Plex',
        logo: '',
        logoPath: '/vLZKlXUNDcZR7ilvfY9Wr9k80FZ.jpg',
      } as WatchProvider;

      const markWatchedPayload = {
        userId: payload.userId,
        tvSeries: tvSeries!,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        runtime: episode.runtime,
        watchProvider,
      };

      await markWatched(markWatchedPayload);

      console.log(
        'Successfully processed scrobble event',
        JSON.stringify(payload),
      );
    }
  } catch (error) {
    console.error('Error processing scrobble event:', error);
    throw error;
  }
};
