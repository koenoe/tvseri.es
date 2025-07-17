import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

import getBaseUrl from './src/utils/getBaseUrl';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  cleanDistDir: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    authInterrupts: true,
    clientSegmentCache: true,
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
    ppr: true,
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
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
  output: 'standalone',
  // Note: to keep the Lambda size small
  outputFileTracingExcludes: {
    '*': [
      './**/*.cjs.map',
      './**/*.js.map',
      './**/*.mjs.map',
      './@babel/types*',
      './@esbuild*',
      './@node-rs/argon2-linux-x64-gnu',
      './@node-rs/argon2-linux-x64-musl',
      './@node-rs/bcrypt-linux-x64-gnu',
      './@node-rs/bcrypt-linux-x64-musl',
      './@swc/core-linux-x64-gnu*',
      './@swc/core-linux-x64-musl*',
      './rollup*',
      './sharp*',
      './source-map-js*',
      './terser*',
      './typescript*',
      './webpack/',
      '**/amphtml-validator/*',
    ],
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
        destination: '/u/:username/in-progress',
        permanent: false,
        source: '/u/:username',
      },
      {
        destination: '/u/:username/finished',
        permanent: true,
        source: '/u/:username/watched',
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
  serverExternalPackages: ['@opennextjs/aws', 'crypto', 'sst'],
  transpilePackages: ['@tvseri.es/token', '@tvseri.es/types'],
  typescript: {
    ignoreBuildErrors: true,
  },
} satisfies NextConfig;

export default withBundleAnalyzer(nextConfig);
