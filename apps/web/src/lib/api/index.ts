// Barrel file - re-exports all API functions from domain modules

// Admin
export { updatePreferredImages } from './admin';
export type { AuthContext } from './client';
export { proxy } from './client';

// Collections
export {
  fetchApplePlusTvSeries,
  fetchBestBritishCrimeTvSeries,
  fetchBestSportsDocumentariesTvSeries,
  fetchKoreasFinestTvSeries,
  fetchMostAnticipatedTvSeries,
  fetchMostPopularTvSeriesThisMonth,
  fetchNetflixOriginals,
  fetchPopularTvSeriesByYear,
  fetchTopRatedTvSeries,
  fetchTrendingTvSeries,
} from './collections';

// Discover
export {
  fetchCountries,
  fetchDiscoverTvSeries,
  fetchLanguages,
  fetchWatchProviders,
} from './discover';

// Dominant Color
export { detectDominantColorFromImage } from './dominant-color';

// Genres
export { fetchGenresForTvSeries } from './genres';

// Keywords
export { fetchKeyword, searchKeywords } from './keywords';

// Lists
export {
  addToFavorites,
  addToList,
  addToWatchlist,
  getListItems,
  getListItemsCount,
  isInFavorites,
  isInList,
  isInWatchlist,
  removeFromFavorites,
  removeFromList,
  removeFromWatchlist,
} from './lists';

// Me (current user)
export { me, updateUser, updateWatchProviders } from './me';

// Person
export {
  fetchPerson,
  fetchPersonKnownFor,
  fetchPersonTvCredits,
} from './person';

// Search
export { searchTvSeries } from './search';

// Series
export {
  fetchTvSeries,
  fetchTvSeriesContentRating,
  fetchTvSeriesCredits,
  fetchTvSeriesEpisode,
  fetchTvSeriesImages,
  fetchTvSeriesKeywords,
  fetchTvSeriesRating,
  fetchTvSeriesRecommendations,
  fetchTvSeriesSeason,
  fetchTvSeriesWatchProvider,
  fetchTvSeriesWatchProviders,
} from './series';

// Social (follow/unfollow)
export {
  follow,
  getFollowerCount,
  getFollowers,
  getFollowing,
  getFollowingCount,
  isFollower,
  isFollowing,
  unfollow,
} from './social';

// Stats
export {
  getStatsCountries,
  getStatsFavoritesCount,
  getStatsGenres,
  getStatsProviders,
  getStatsSpotlight,
  getStatsSummary,
  getStatsWatchedSeries,
  getStatsWeekly,
} from './stats';

// Users
export { findUser } from './users';

// Watched
export {
  getAllWatchedForTvSeries,
  getWatched,
  getWatchedCount,
  getWatchedRuntime,
  markWatched,
  markWatchedInBatch,
  unmarkWatched,
  unmarkWatchedInBatch,
} from './watched';

// Webhooks
export { fetchTokenForWebhook, fetchTokenForWebhookByType } from './webhooks';
