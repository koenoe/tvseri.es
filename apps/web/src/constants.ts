export const DEFAULT_BACKGROUND_COLOR = '#171717';
export const DEFAULT_BACKGROUND_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Must match TTL in apps/auth/src/index.ts
export const ACCESS_TOKEN_TTL = 60 * 5; // 5 minutes
export const SESSION_REFRESH_THRESHOLD = 60; // Refresh when less than 60 seconds remaining
