import type { Episode, Season } from '@tvseri.es/schemas';

/** The episode fields the page's client parts read (wall, sheet, modal). */
export type ShowEpisode = Readonly<
  Pick<
    Episode,
    | 'airDate'
    | 'description'
    | 'episodeNumber'
    | 'hasAired'
    | 'id'
    | 'runtime'
    | 'seasonNumber'
    | 'stillImage'
    | 'title'
  >
>;

export type ShowSeasonEpisodes = Readonly<{
  seasonNumber: number;
  episodes: ReadonlyArray<ShowEpisode>;
}>;

/** Trims a season to what the client reads (RSC payload and the route). */
export function toShowSeasonEpisodes(season: Season): ShowSeasonEpisodes {
  return {
    episodes: season.episodes.map((episode) => ({
      airDate: episode.airDate,
      description: episode.description,
      episodeNumber: episode.episodeNumber,
      hasAired: episode.hasAired,
      id: episode.id,
      runtime: episode.runtime,
      seasonNumber: episode.seasonNumber,
      stillImage: episode.stillImage,
      title: episode.title,
    })),
    seasonNumber: season.seasonNumber,
  };
}
