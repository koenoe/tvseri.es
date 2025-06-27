import type { RetryOptions } from '@better-fetch/fetch';

export const DEFAULT_BACKGROUND_COLOR = '#171717';
export const DEFAULT_BACKGROUND_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const DEFAULT_FETCH_RETRY_OPTIONS = {
  attempts: 4,
  baseDelay: 250, // Initial + 3 retries
  maxDelay: 2000, // Start with 250ms delay
  type: 'exponential', // Cap at 2 seconds
} as RetryOptions;

export const SESSION_DURATION = 6 * 30 * 24 * 60 * 60; // 6 months in seconds
