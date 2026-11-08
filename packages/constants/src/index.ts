export { CACHE_LIFE, type CacheLifeProfile } from './cacheLife';
export { DASHBOARD_READ } from './dashboardRead';
export {
  PLEX_SCROBBLE_EVENT,
  SCROBBLE_PROVIDERS,
  SCROBBLE_WEBHOOK_PATH_SOURCE,
  type ScrobbleProvider,
  WEBHOOK_TOKEN_KV_PREFIX,
  WEBHOOK_TOKEN_PATTERN_SOURCE,
} from './scrobble';
export { WEB_VITALS_SAMPLE_RATE } from './webVitals';

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
