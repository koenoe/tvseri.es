import type { paths } from '../tmdb-v3';

export type TmdbTvSeries =
  paths[`/3/tv/${number}`]['get']['responses']['200']['content']['application/json'] & {
    /** Present when requested with `append_to_response=external_ids` */
    external_ids?: { imdb_id?: string | null };
    images: paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeriesImages =
  paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];

export type TmdbMovie =
  paths[`/3/movie/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeriesContentRatings =
  paths[`/3/tv/${number}/content_ratings`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesWatchProviders =
  paths[`/3/tv/${number}/watch/providers`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesCredits =
  paths[`/3/tv/${number}/aggregate_credits`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesRecommendations =
  paths[`/3/tv/${number}/recommendations`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesKeywords =
  paths[`/3/tv/${number}/keywords`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesSeason =
  paths[`/3/tv/${number}/season/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesEpisode =
  paths[`/3/tv/${number}/season/${number}/episode/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverTvSeries =
  paths['/3/discover/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverMovieQuery =
  paths['/3/discover/movie']['get']['parameters']['query'];

export type TmdbDiscoverTvSeriesQuery =
  paths['/3/discover/tv']['get']['parameters']['query'];

export type TmdbSearchTvSeries =
  paths['/3/search/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbSearchPerson =
  paths['/3/search/person']['get']['responses']['200']['content']['application/json'];

export type TmdbCountries =
  paths['/3/configuration/countries']['get']['responses']['200']['content']['application/json'];

export type TmdbLanguages =
  paths['/3/configuration/languages']['get']['responses']['200']['content']['application/json'];

export type TmdbGenresForTvSeries =
  paths['/3/genre/tv/list']['get']['responses']['200']['content']['application/json'];

export type TmdbWatchProviders =
  paths['/3/watch/providers/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbPerson =
  paths[`/3/person/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbPersonTvCredits =
  paths[`/3/person/${number}/tv_credits`]['get']['responses']['200']['content']['application/json'];

export type TmdbExternalSource =
  paths[`/3/find/${string}`]['get']['parameters']['query']['external_source'];

export type TmdbFindByIdResults =
  paths[`/3/find/${string}`]['get']['responses']['200']['content']['application/json'];

export type TmdbNetwork =
  paths[`/3/network/${number}`]['get']['responses']['200']['content']['application/json'];
