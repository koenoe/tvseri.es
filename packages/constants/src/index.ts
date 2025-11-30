import type { RetryOptions } from '@better-fetch/fetch';

export const DEFAULT_FETCH_RETRY_OPTIONS = {
  attempts: 4,
  baseDelay: 250, // Initial + 3 retries
  maxDelay: 2000, // Start with 250ms delay
  type: 'exponential', // Cap at 2 seconds
} as RetryOptions;

export const WATCH_PROVIDER_PREDEFINED_COLOR: Record<string, string> = {
  'Amazon Prime Video': '#00A8E1',
  'BBC iPlayer': '#FF4E98',
  'Disney+': '#0E47BA',
  ITVX: '#102C3D',
  Netflix: '#E50914',
  'Now TV': '#00818A',
  Unknown: '#000000',
};

export const WATCH_PROVIDER_PRIORITY: Record<string, number> = {
  'Apple TV+': -5,
  'BBC iPlayer': -10,
  Netflix: 0,
  'Sky Go': 1000, // Sky Go is only available for Sky TV customers, so kinda sucks
};

export const AUTH_TTL =
  process.env.NODE_ENV === 'development'
    ? {
        access: 60 * 5, // 5 minutes
        refresh: 60 * 60 * 2, // 2 hour
        reuse: 60 * 60 * 1, // 1 hour
      }
    : {
        access: 60 * 60 * 24, // 1 day
        refresh: 60 * 60 * 24 * 365, // 1 year
        reuse: 60 * 60 * 24 * 7, // 7 days
      };
