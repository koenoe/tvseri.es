import { type RetryOptions } from '@better-fetch/fetch';

// TODO: eventually we'll just show the provider that users are subscribed to
// but in order to do this we need a profile page or some way to store this information
export const WATCH_PROVIDER_PRIORITY: Record<string, number> = {
  'BBC iPlayer': -10,
  Netflix: 0,
  'Sky Go': 1000, // Sky Go is only available for Sky TV customers, so kinda sucks
};

export const DEFAULT_FETCH_RETRY_OPTIONS = {
  type: 'exponential',
  attempts: 4, // Initial + 3 retries
  baseDelay: 250, // Start with 250ms delay
  maxDelay: 2000, // Cap at 2 seconds
} as RetryOptions;
