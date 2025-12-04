import type { RetryOptions } from '@better-fetch/fetch';

export const DEFAULT_FETCH_RETRY_OPTIONS = {
  attempts: 4,
  baseDelay: 250,
  maxDelay: 2000,
  type: 'exponential',
} as RetryOptions;

// 14 second timeout - prevents hung requests from blocking Lambda
export const DEFAULT_FETCH_TIMEOUT = 14000;

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
        refresh: 60 * 60 * 24 * 1, // 1 day
        reuse: 60 * 60 * 24 * 1, // 1 day
      }
    : {
        access: 60 * 60 * 24, // 1 day
        refresh: 60 * 60 * 24 * 365, // 1 year
        reuse: 60 * 60 * 24 * 7, // 7 days
      };
