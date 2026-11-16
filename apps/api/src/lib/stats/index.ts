/**
 * Stats module - centralized stats logic for the API.
 */

export { getAllTimeStats } from './allTime';
// Cache operations
export { getStatsCache, invalidateAllTimeStats } from './cache';
// The year's first and last watch, and its favourites
export { getFavoritesCount, getYearSpotlight } from './highlights';
export { countsInStats } from './regular';
// Segments derived from a year's watched items, and the summary metrics
export {
  computeYearSegment,
  getSummaryMetrics,
  type YearSegment,
} from './year';
