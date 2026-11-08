/**
 * Stats module - centralized stats logic for the API.
 */

// Cache operations
export { getStatsCache, invalidateStatsCache, setStatsCache } from './cache';

// Segments derived from a year's watched items, and the summary metrics
export {
  computeYearSegment,
  getSummaryMetrics,
  type YearSegment,
} from './year';
