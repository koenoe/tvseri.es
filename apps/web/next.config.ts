import path from 'node:path';
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
    const shouldAddNoIndexHeader =
      baseUrl.includes('dev') ||
      baseUrl.includes('vercel') ||
      baseUrl.includes('localhost');
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
      ...(shouldAddNoIndexHeader
        ? [
            {
              headers: [
                {
                  key: 'X-Robots-Tag',
                  value: 'noindex, nofollow',
                },
              ],
              source: '/:path*',
            },
          ]
        : []),
    ];
  },
  // Required for monorepo: tells Next.js where the root is so traced files
  // (in .vc-config.json filePathMap) have correct absolute paths
  outputFileTracingRoot: path.join(__dirname, '../../'),
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
