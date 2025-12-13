// CORS configuration
export const CORS_CONFIG = {
  allowHeaders: [
    'Authorization',
    'Content-Type',
    'X-Api-Key',
    'X-Client-Platform',
    'X-Client-Version',
  ],
  allowMethods: ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
  credentials: true,
  maxAge: 86400,
  // Origin patterns as strings for edge function interpolation
  originPatterns: [
    '^https://[^.]+\\.tvseri\\.es$', // *.tvseri.es
    '^https://[^.]+\\.[^.]+\\.dev\\.tvseri\\.es$', // *.*.dev.tvseri.es
  ],
} as const;

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
