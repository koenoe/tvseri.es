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
    inlineCss: true,
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
