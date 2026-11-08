import { CACHE_LIFE } from '@tvseri.es/constants';
import type { NextConfig } from 'next';

import getBaseUrl from './src/utils/getBaseUrl';

/**
 * `use cache` profiles mirror the API's Cache-Control (`CACHE_LIFE`):
 * fresh for `s-maxage`, then served stale for `stale-while-revalidate`.
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
     * Only cached (`use cache`) and static output is reused: uncached,
     * user-specific API reads stay dynamic holes and refetch per navigation.
     */
    cachedNavigations: true,
    // No `inlineCss`: it put the full Tailwind CSS in every page 3–4× (<style>
    // plus 2–3 copies in the RSC payload), ~150–200 KB uncompressed per page.
    // One cached stylesheet is cheaper for ISR units, prefetches and parsing.
    // Note: don't think this does much, but alas
    optimizePackageImports: [
      'date-fns',
      'motion',
      'papaparse',
      'react-day-picker',
      'react-dropzone',
      'recharts',
      'sonner',
      'use-debounce',
      'zustand',
    ],
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
    const baseUrl = getBaseUrl();
    const hostNoIndexHeaders = [
      '.*\\.vercel\\.app',
      '.*\\.dev\\.tvseri\\.es',
    ].map((value) => ({
      has: [
        {
          type: 'host' as const,
          value,
        },
      ],
      headers: [
        {
          key: 'X-Robots-Tag',
          value: 'noindex, nofollow',
        },
      ],
      source: '/:path*',
    }));
    return [
      {
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: baseUrl,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
        source: '/api/:path*',
      },
      ...hostNoIndexHeaders,
    ];
  },
  /**
   * Every `next/image` goes through `tmdbImageLoader`, which picks a TMDB CDN
   * size per srcset width. Never the default loader: Vercel Image Optimization
   * would raise Vercel costs massively. Non-TMDB images (local SVGs, flags,
   * cast face crops) set `unoptimized`.
   *
   * The widths are TMDB's standard sizes, so srcset descriptors match the
   * files they point to. A `vw`-based `sizes` only gets widths from
   * `deviceSizes[0] × ratio` up (e.g. `100vw` → 780, 1280, 1920).
   */
  images: {
    deviceSizes: [780, 1280, 1920],
    imageSizes: [92, 154, 185, 300, 342, 454, 500],
    loader: 'custom',
    loaderFile: './src/lib/tmdbImageLoader.ts',
  },
  partialPrefetching: true,
  async redirects() {
    return [
      {
        destination: '/',
        permanent: true,
        source: '/home',
      },
      {
        destination: '/settings/profile',
        permanent: false,
        source: '/settings',
      },
      {
        destination: '/u/:username/in-progress',
        permanent: false,
        source: '/u/:username',
      },
    ];
  },
  async rewrites() {
    return {
      // Non-numeric ids can never exist: serve the static, prerendered 404
      // (an unmatched path) instead of invoking a function / ISR entry per URL.
      beforeFiles: [
        {
          // Scrobble webhooks keep the URL users pasted into their media
          // server, but go straight to the API: an external rewrite is proxied
          // by Vercel's CDN, so no function runs. The API's edge function
          // checks the token (infra/apiEdgeInjection.ts).
          destination: `${process.env.API_URL}/scrobble/provider/:provider`,
          source: '/api/webhooks/scrobble/:provider',
        },
        {
          destination: '/_not-found-static',
          source: '/:section(tv|person)/:id((?!\\d+(?:/|$))[^/]+)/:rest*',
        },
        {
          destination: '/home',
          source: '/',
        },
      ],
    };
  },
  transpilePackages: [
    '@tvseri.es/constants',
    '@tvseri.es/schemas',
    '@tvseri.es/utils',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
} satisfies NextConfig;

export default nextConfig;
