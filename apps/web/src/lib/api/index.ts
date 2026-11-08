// Barrel file - re-exports all API functions from domain modules

// Admin
export { deletePreferredImages, updatePreferredImages } from './admin';
export { ApiError, proxy } from './client';

// Collections
export {
  fetchApplePlusTvSeries,
  fetchBestBritishCrimeTvSeries,
  fetchBestSportsDocumentariesTvSeries,
  fetchKoreasFinestTvSeries,
  fetchMostAnticipatedTvSeries,
  fetchMostPopularTvSeriesThisMonth,
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
  addToWatchlist,
  getListItems,
  getListStatus,
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
  fetchTvSeriesCast,
  fetchTvSeriesContentRating,
  fetchTvSeriesImages,
  fetchTvSeriesKeywords,
  fetchTvSeriesRating,
  fetchTvSeriesRecommendations,
  fetchTvSeriesSeason,
  fetchTvSeriesWatchProvider,
} from './series';

// Social (follow/unfollow)
export {
  follow,
  getFollowers,
  getFollowing,
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
export {
  findPublicUser,
  findUser,
  getProfileCount,
  type ProfileCount,
  usernameCacheTag,
} from './users';

// Watched
export {
  getWatched,
  getWatchedProgressForTvSeries,
  getWatchedTrackForTvSeries,
  markWatched,
  markWatchedInBatch,
  unmarkWatched,
  unmarkWatchedInBatch,
} from './watched';

// Webhooks
export { fetchTokenForWebhookByType } from './webhooks';
