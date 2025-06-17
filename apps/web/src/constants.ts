import { type RetryOptions } from '@better-fetch/fetch';

export const DEFAULT_BACKGROUND_COLOR = '#171717';
export const DEFAULT_BACKGROUND_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const DEFAULT_FETCH_RETRY_OPTIONS = {
  type: 'exponential',
  attempts: 4, // Initial + 3 retries
  baseDelay: 250, // Start with 250ms delay
  maxDelay: 2000, // Cap at 2 seconds
} as RetryOptions;
