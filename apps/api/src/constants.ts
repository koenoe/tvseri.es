import type { RetryOptions } from '@better-fetch/fetch';
import { Resource } from 'sst';

export const WATCH_PROVIDER_PREDEFINED_COLOR: Record<string, string> = {
  'Amazon Prime Video': '#00A8E1',
  'BBC iPlayer': '#FF4E98',
  'Disney+': '#0E47BA',
  ITVX: '#102C3D',
  Netflix: '#E50914',
  'Now TV': '#00818A',
  Unknown: '#000000',
};

// TODO: eventually we'll just show the provider that users are subscribed to
// but in order to do this we need a profile page or some way to store this information
export const WATCH_PROVIDER_PRIORITY: Record<string, number> = {
  'Apple TV+': -5,
  'BBC iPlayer': -10,
  Netflix: 0,
  'Sky Go': 1000, // Sky Go is only available for Sky TV customers, so kinda sucks
};

export const DEFAULT_FETCH_RETRY_OPTIONS = {
  attempts: 4,
  baseDelay: 250, // Initial + 3 retries
  maxDelay: 2000, // Start with 250ms delay
  type: 'exponential', // Cap at 2 seconds
} as RetryOptions;

export const SECRET_KEY = Resource.SecretKey.value;
