/**
 * The security headers every response gets (`next.config.ts` `headers()`).
 *
 * Static on purpose: a per-request nonce would make every page
 * dynamic, and the shell stays static. So scripts load from `'self'` plus
 * inline (Next's bootstrap and RSC payload scripts differ per page, so
 * hashes can't list them).
 *
 * Rollback: a header that breaks a page is loosened here and pushed; no
 * redeploy of an earlier build is needed.
 */

type BuildEnv = Readonly<{
  /** `next dev`: React's dev tooling needs eval. */
  dev: boolean;
  /** A Vercel preview build: the toolbar (comments) loads from vercel.live. */
  vercelPreview: boolean;
  /**
   * A local build or dev server against the stubs (e2e): their
   * placeholder images come from the stubs' origins. Never set on Vercel
   * (`localStubOrigins`).
   */
  localImages?: ReadonlyArray<string>;
}>;

type Header = Readonly<{ key: string; value: string }>;

/** Every image is a TMDB CDN URL (`lib/tmdbImageLoader.ts`) or bundled. */
const TMDB_IMAGES = 'https://image.tmdb.org';

/**
 * What the Vercel toolbar needs on previews (vercel.com/docs/vercel-toolbar/
 * managing-toolbar, "Using a Content Security Policy"). Production never
 * gets it.
 */
const VERCEL_TOOLBAR = {
  'connect-src': ['https://vercel.live', 'wss://ws-us3.pusher.com'],
  'font-src': ['https://vercel.live', 'https://assets.vercel.com'],
  'frame-src': ['https://vercel.live'],
  'img-src': ['https://vercel.live', 'https://vercel.com'],
  'script-src': ['https://vercel.live'],
  'style-src': ['https://vercel.live'],
} as const;

type Directive =
  | 'base-uri'
  | 'connect-src'
  | 'default-src'
  | 'font-src'
  | 'form-action'
  | 'frame-ancestors'
  | 'frame-src'
  | 'img-src'
  | 'object-src'
  | 'script-src'
  | 'style-src';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const localOrigin = (value: string | undefined): string[] => {
  if (!value || !URL.canParse(value)) {
    return [];
  }
  const url = new URL(value);
  return url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)
    ? [url.origin]
    : [];
};

/**
 * The origins of the local stubs among `urls` (`API_URL`, `AUTH_URL`): a
 * local `http:` URL serves the stubs' placeholder images. Empty on Vercel,
 * so a deployed policy can never gain one.
 */
export function localStubOrigins(
  urls: ReadonlyArray<string | undefined>,
  onVercel: boolean,
): ReadonlyArray<string> {
  return onVercel ? [] : [...new Set(urls.flatMap(localOrigin))];
}

export function contentSecurityPolicy({
  dev,
  localImages,
  vercelPreview,
}: BuildEnv): string {
  const policy: Record<Directive, string[]> = {
    'base-uri': ["'self'"],
    // same origin: RSC fetches, /api/search, the web-vitals beacon
    'connect-src': ["'self'"],
    'default-src': ["'self'"],
    // next/font serves the fonts from the app itself
    'font-src': ["'self'"],
    // logout posts to /api/auth/logout; login is a link, not a form
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'frame-src': ["'none'"],
    // data: for inline placeholders, blob: for images made in the browser
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      TMDB_IMAGES,
      ...(localImages ?? []),
    ],
    'object-src': ["'none'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    // React writes `style` attributes; next/font and Sonner inline <style>
    'style-src': ["'self'", "'unsafe-inline'"],
  };

  if (vercelPreview) {
    policy['frame-src'] = [];
    for (const [directive, sources] of Object.entries(VERCEL_TOOLBAR)) {
      policy[directive as keyof typeof VERCEL_TOOLBAR].push(...sources);
    }
  }

  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/** Device features the site never asks for. Clipboard and share stay on. */
const DENIED_FEATURES = [
  'accelerometer',
  // not 'browsing-topics': Chrome dropped the Topics API and logs it as unknown
  'camera',
  'display-capture',
  'geolocation',
  'gyroscope',
  'hid',
  'magnetometer',
  'microphone',
  'midi',
  'payment',
  'serial',
  'usb',
] as const;

export function securityHeaders(env: BuildEnv): ReadonlyArray<Header> {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(env) },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    {
      key: 'Permissions-Policy',
      value: DENIED_FEATURES.map((feature) => `${feature}=()`).join(', '),
    },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // two years; no `preload` (that is a commitment to the HSTS list)
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains',
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // legacy twin of `frame-ancestors 'none'`
    { key: 'X-Frame-Options', value: 'DENY' },
  ];
}
