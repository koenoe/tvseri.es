/**
 * Stats module - centralized stats logic for the API.
 */

// Aggregation functions
export {
  aggregateCountries,
  aggregateGenres,
  aggregateProviders,
} from './aggregations';
// Cache operations
export {
  getStatsCache,
  invalidateStatsCache,
  setStatsCache,
} from './cache';
// Pure calculation functions
export {
  calculateLongestStreak,
  calculateMetrics,
  getUniqueSeriesIds,
} from './calculations';

// Data fetching
export { getWatchedItemsForYear } from './data';

// Keys (for advanced use cases)
export {
  buildStatsCacheKey,
  getAllStatsCacheKeys,
  STATS_CACHE_KEYS,
  type StatsCacheKey,
} from './keys';
