import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

import getBaseUrl from './src/utils/getBaseUrl';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
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
