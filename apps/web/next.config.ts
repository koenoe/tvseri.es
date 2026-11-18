import { CACHE_LIFE } from '@tvseri.es/constants';
import type { NextConfig } from 'next';

import { LANDING_NOT_FOUND_REWRITES } from './src/lib/routing/landingNotFound';
import { LEGACY_DISCOVER_REWRITES } from './src/lib/routing/legacyDiscover';
import {
  LIBRARY_NOT_FOUND_REWRITES,
  STATS_YEAR_NOT_FOUND_REWRITE,
  USERNAME_NOT_FOUND_REWRITE,
} from './src/lib/routing/profileNotFound';
import { REDIRECTS } from './src/lib/routing/redirects';
import {
  LONG_ID_NOT_FOUND_REWRITES,
  NOT_FOUND_REWRITE,
  PERSON_NOT_FOUND_REWRITE,
  RESERVED_SUBPATH_NOT_FOUND_REWRITES,
} from './src/lib/routing/reservedSegments';
import { localStubOrigins, securityHeaders } from './src/lib/security/headers';

/**
 * `use cache` profiles mirror the API's Cache-Control (`CACHE_LIFE`):
 * fresh for `s-maxage`, then served stale for `stale-while-revalidate`.
 * Change lifetimes there, never per route.
 */
const cacheLife = Object.fromEntries(
  Object.entries(CACHE_LIFE).map(([profile, life]) => [
    profile,
    {
      expire: life.sMaxAge + life.staleWhileRevalidate,
      revalidate: life.sMaxAge,
      stale: life.maxAge,
    },
  ]),
);

/**
 * Scrobble webhooks keep the URL users pasted into their media server, but go
 * straight to the API: an external rewrite is proxied by Vercel's CDN, so no
 * function runs. The API's edge function checks the token
 * (infra/apiEdgeInjection.ts). Every deployed build has API_URL; a local build
 * without it (tests, the style guide) skips the rewrite.
 */
function scrobbleRewrite() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    if (process.env.VERCEL) {
      throw new Error('API_URL is required to build the scrobble rewrite');
    }
    return [];
  }
  return [
    {
      destination: `${apiUrl}/scrobble/provider/:provider`,
      source: '/api/webhooks/scrobble/:provider',
    },
  ];
}

const nextConfig = {
  agentRules: false,
  cacheComponents: true,
  cacheLife,
  cleanDistDir: true,
  experimental: {
    authInterrupts: true,
    /**
     * Seeds the client router cache from real navigations (static stage +
     * runtime prefetch), so revisits are instant. Next 16.4 already turns it
     * on with `cacheComponents`; it's explicit here so the choice is visible.
     */
    cachedNavigations: true,
    // The `instant()` e2e suite needs Next's testing API in a production
    // build. Only the local e2e build sets this; a Vercel build never gets
    // it, even if the variable were set in the project's environment.
    exposeTestingApiInProductionBuild:
      process.env.EXPOSE_TESTING_API === '1' && !process.env.VERCEL,
    // No `inlineCss`: it put the full CSS in every page 3–4× (<style> plus
    // copies in the RSC payload). One cached stylesheet is cheaper.
    optimizePackageImports: ['motion', 'sonner', 'zustand'],
    /**
     * Reuse prefetched static pages/shells in the browser for 30 min instead
     * of 5, so fewer prefetch requests. Static output holds no user data;
     * `dynamic` stays 0, so user-specific parts still refetch per navigation.
     */
    staleTimes: {
      static: 1800,
    },
  },
  async headers() {
    // Previews are never indexed (production has robots.txt disallow-all).
    const noIndexPreviews = ['.*\\.vercel\\.app', '.*\\.dev\\.tvseri\\.es'].map(
      (value) => ({
        has: [{ type: 'host' as const, value }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
        source: '/:path*',
      }),
    );
    // One static set for every response, the static 404 included
    // (lib/security/headers.ts).
    const security = {
      headers: [
        ...securityHeaders({
          dev: process.env.NODE_ENV === 'development',
          localImages: localStubOrigins(
            [process.env.API_URL, process.env.AUTH_URL],
            Boolean(process.env.VERCEL),
          ),
          vercelPreview: process.env.VERCEL_ENV === 'preview',
        }),
      ],
      source: '/:path*',
    };
    return [security, ...noIndexPreviews];
  },
  /**
   * Every `next/image` goes through `tmdbImageLoader`, which picks a TMDB CDN
   * size per srcset width. Never the default loader: Vercel Image Optimization
   * would raise Vercel costs massively. Non-TMDB images set `unoptimized`.
   *
   * The widths are TMDB's standard sizes, so srcset descriptors match the
   * files they point to. A `vw`-based `sizes` only gets widths from
   * `deviceSizes[0] × ratio` up (e.g. `100vw` → 780, 1280, 1920).
   */
  images: {
    deviceSizes: [780, 1280, 1920],
    imageSizes: [45, 92, 154, 185, 300, 342, 500],
    loader: 'custom',
    loaderFile: './src/lib/tmdbImageLoader.ts',
  },
  partialPrefetching: true,
  async redirects() {
    return [...REDIRECTS];
  },
  async rewrites() {
    return {
      beforeFiles: [
        ...scrobbleRewrite(),
        // Old filter-grid links redirect to their landing.
        ...LEGACY_DISCOVER_REWRITES,
        // A first segment that is neither a number nor a reserved route can
        // never exist: serve the static 404 without running a function.
        NOT_FOUND_REWRITE,
        // A path under a reserved segment none of its routes serves
        // (`/settings/services`), which would otherwise reach the show route
        ...RESERVED_SUBPATH_NOT_FOUND_REWRITES,
        // Likewise a landing slug that isn't one (`/genre/junk`).
        ...LANDING_NOT_FOUND_REWRITES,
        PERSON_NOT_FOUND_REWRITE,
        // A show or person id longer than any TMDB id
        ...LONG_ID_NOT_FOUND_REWRITES,
        // A username that can't exist, a Stats year without a page, a
        // Library shelf that isn't one
        USERNAME_NOT_FOUND_REWRITE,
        STATS_YEAR_NOT_FOUND_REWRITE,
        ...LIBRARY_NOT_FOUND_REWRITES,
      ],
    };
  },
  transpilePackages: [
    '@tvseri.es/constants',
    '@tvseri.es/schemas',
    '@tvseri.es/utils',
  ],
} satisfies NextConfig;

export default nextConfig;
