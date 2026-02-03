import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

import getBaseUrl from './src/utils/getBaseUrl';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // TODO: enable once we've ironed out background issues
  // cacheComponents: true,
  // cacheLife: {
  //   // Matches API: public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=86400
  //   // Used for: collections, genres, countries, languages (reference data)
  //   long: {
  //     expire: 2629800 + 86400, // 1 month + 1 day SWR
  //     revalidate: 2629800, // 1 month
  //     stale: 2629800, // 1 month
  //   },
  //   // Matches API: public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400
  //   // Used for: discover, search, person, keywords, credits (semi-static content)
  //   medium: {
  //     expire: 604800 + 86400, // 1 week + 1 day SWR
  //     revalidate: 604800, // 1 week
  //     stale: 604800, // 1 week
  //   },
  //   // Matches API: public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600
  //   // Used for: series details, trending, ratings (daily updates)
  //   short: {
  //     expire: 86400 + 21600, // 24h + 6h SWR
  //     revalidate: 86400, // 24 hours
  //     stale: 86400, // 24 hours
  //   },
  // },
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
      'xstate',
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
        destination: '/u/:username/history',
        permanent: false,
        source: '/u/:username',
      },
    ];
  },
  async rewrites() {
    return [
      {
        destination: '/home',
        source: '/',
      },
    ];
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

export default withBundleAnalyzer(nextConfig);
