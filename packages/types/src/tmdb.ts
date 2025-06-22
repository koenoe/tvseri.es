import { type paths } from '../tmdb-v3';

export type TmdbTvSeries =
  paths[`/3/tv/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeriesImages =
  paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];

export type TmdbMovie =
  paths[`/3/movie/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeriesAccountStates =
  paths[`/3/tv/${number}/account_states`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesContentRatings =
  paths[`/3/tv/${number}/content_ratings`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesWatchProviders =
  paths[`/3/tv/${number}/watch/providers`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesCredits =
  paths[`/3/tv/${number}/aggregate_credits`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesRecommendations =
  paths[`/3/tv/${number}/recommendations`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesSimilar =
  paths[`/3/tv/${number}/similar`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesKeywords =
  paths[`/3/tv/${number}/keywords`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesSeason =
  paths[`/3/tv/${number}/season/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesEpisode =
  paths[`/3/tv/${number}/season/${number}/episode/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbTrendingTvSeries =
  paths[`/3/trending/tv/${string}`]['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverMovies =
  paths['/3/discover/movie']['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverTvSeries =
  paths['/3/discover/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverMovieQuery =
  paths['/3/discover/movie']['get']['parameters']['query'];

export type TmdbDiscoverTvSeriesQuery =
  paths['/3/discover/tv']['get']['parameters']['query'];

export type TmdbDiscoverQuery =
  | TmdbDiscoverMovieQuery
  | TmdbDiscoverTvSeriesQuery;

export type TmdbSearchTvSeries =
  paths['/3/search/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbKeywords =
  paths['/3/search/keyword']['get']['responses']['200']['content']['application/json'];

export type TmdbSearchPerson =
  paths['/3/search/person']['get']['responses']['200']['content']['application/json'];

export type TmdbKeyword =
  paths[`/3/keyword/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbCountries =
  paths['/3/configuration/countries']['get']['responses']['200']['content']['application/json'];

export type TmdbLanguages =
  paths['/3/configuration/languages']['get']['responses']['200']['content']['application/json'];

export type TmdbGenresForTvSeries =
  paths['/3/genre/tv/list']['get']['responses']['200']['content']['application/json'];

export type TmdbAccountDetails =
  paths[`/3/account/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbWatchlist =
  paths[`/3/account/${number}/watchlist/tv`]['get']['responses']['200']['content']['application/json'];

export type TmdbFavorites =
  paths[`/3/account/${number}/favorite/tv`]['get']['responses']['200']['content']['application/json'];

export type TmdbWatchProviders =
  paths['/3/watch/providers/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbPerson =
  paths[`/3/person/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbPersonImages =
  paths[`/3/person/${number}/images`]['get']['responses']['200']['content']['application/json'];

export type TmdbPersonCredits =
  paths[`/3/person/${number}/combined_credits`]['get']['responses']['200']['content']['application/json'];

export type TmdbPersonTvCredits =
  paths[`/3/person/${number}/tv_credits`]['get']['responses']['200']['content']['application/json'];

export type TmdbExternalSource =
  paths[`/3/find/${string}`]['get']['parameters']['query']['external_source'];

export type TmdbFindByIdResults =
  paths[`/3/find/${string}`]['get']['responses']['200']['content']['application/json'];
