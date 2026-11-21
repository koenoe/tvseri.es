export { API_METRICS_SAMPLE_RATE } from './apiMetrics';
export { AUTH_EDGE_KEY_HEADER } from './authEdge';
export {
  type AuthNotice,
  GOOGLE_UNVERIFIED_DESCRIPTION,
  isAuthNotice,
} from './authNotice';
export { CACHE_LIFE, type CacheLifeProfile } from './cacheLife';
export { DASHBOARD_READ } from './dashboardRead';
export {
  DURATION_TILES_VERSION,
  hasEnoughPosters,
  isCappedCount,
  MIN_POSTERS,
  TMDB_COUNT_CAP,
} from './discover';
export { HOME_MOMENTS_VERSION } from './homeMoments';
export { WHATS_ON_NETWORKS, WHERE_SET_PLACES } from './homeToys';
export {
  allOf,
  DISCOVER_FILTER_KEYS,
  excluding,
  genreName,
  keywordLanding,
  LANDING_SLUGS,
  LANDING_TYPES,
  type LandingFilter,
  type LandingType,
  landingFilter,
  landingPathFromDiscoverQuery,
  landingSlugForId,
  networkById,
  networkBySlug,
  themeBySlug,
} from './landings';
export { isLocalHost, isLocalHttp } from './localHost';
export { LOGO_PATH, LOGO_VIEWBOX } from './logo';
export { NETWORKS } from './networks';
export { CATCHING_UP_MIN } from './overview';
export { PAGE_COLOR_VERSION } from './pageColor';
export {
  BBC_IPLAYER_WATCH_PROVIDER,
  NETFLIX_WATCH_PROVIDER,
  PLEX_SCROBBLE_EVENT,
  PLEX_WATCH_PROVIDER,
  PRIME_VIDEO_WATCH_PROVIDER,
  SCROBBLE_PROVIDERS,
  SCROBBLE_WEBHOOK_PATH_SOURCE,
  type ScrobbleProvider,
  WEBHOOK_TOKEN_KV_PREFIX,
  WEBHOOK_TOKEN_PATTERN_SOURCE,
} from './scrobble';
export { MAX_TMDB_ID_DIGITS, TMDB_ID_PATTERN } from './tmdbId';
export { MAX_EPISODES_PER_SERIES_MARK } from './watched';
export { WEB_VITALS_SAMPLE_RATE } from './webVitals';

export const WATCH_PROVIDER_PREDEFINED_COLOR: Readonly<Record<string, string>> =
  {
    'Amazon Prime Video': '#00A8E1',
    'BBC iPlayer': '#FF4E98',
    'Disney+': '#0E47BA',
    ITVX: '#102C3D',
    Netflix: '#E50914',
    'Now TV': '#00818A',
    Unknown: '#000000',
  };

export const WATCH_PROVIDER_PRIORITY: Readonly<Record<string, number>> = {
  'Apple TV+': -5,
  'BBC iPlayer': -10,
  Netflix: 0,
  'Sky Go': 1000, // needs a Sky TV subscription, so it sorts last
};
