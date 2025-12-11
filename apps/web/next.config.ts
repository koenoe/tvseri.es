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
  output: 'standalone',
  // Note: to keep the Lambda size small
  outputFileTracingExcludes: {
    '*': [
      // Source maps (not needed in production)
      './**/*.cjs.map',
      './**/*.js.map',
      './**/*.mjs.map',
      './**/*.d.ts',
      './**/*.d.ts.map',
      // Build tools (not needed at runtime)
      './@babel*',
      './@esbuild*',
      './@node-rs/argon2-linux-x64-gnu',
      './@node-rs/argon2-linux-x64-musl',
      './@node-rs/bcrypt-linux-x64-gnu',
      './@node-rs/bcrypt-linux-x64-musl',
      './@swc/core-linux-x64-gnu*',
      './@swc/core-linux-x64-musl*',
      './rollup*',
      './sharp*',
      './terser*',
      './typescript*',
      './webpack*',
      '**/amphtml-validator/*',
      // Debug tools (not needed in production)
      './source-map@*',
      './source-map-support@*',
      './source-map-js*',
      // Version checking (not needed at runtime)
      './semver*',
      // Duplicate/unused packages
      './detect-libc*',
      './buffer-from*',
      './styled-jsx*',
      // Next.js build artifacts not needed at runtime
      './**/next/dist/compiled/webpack/*',
      './**/next/dist/compiled/@babel/*',
      './**/next/dist/compiled/terser/*',
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
  serverExternalPackages: ['@opennextjs/aws', 'crypto', 'sst'],
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
