import { type NextConfig } from 'next';

import getBaseUrl from './src/utils/getBaseUrl';

const nextConfig = {
  experimental: {
    authInterrupts: true,
    inlineCss: true,
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  cleanDistDir: true,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    const baseUrl = getBaseUrl();
    const shouldAddNoIndexHeader =
      baseUrl.includes('dev') ||
      baseUrl.includes('vercel') ||
      baseUrl.includes('localhost');

    return [
      {
        source: '/api/:path*',
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
      },
      ...(shouldAddNoIndexHeader
        ? [
            {
              source: '/:path*',
              headers: [
                {
                  key: 'X-Robots-Tag',
                  value: 'noindex, nofollow',
                },
              ],
            },
          ]
        : []),
    ];
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/home',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/settings',
        destination: '/settings/profile',
        permanent: false,
      },
      {
        source: '/u/:username',
        destination: '/u/:username/in-progress',
        permanent: false,
      },
      {
        source: '/u/:username/watched',
        destination: '/u/:username/finished',
        permanent: true,
      },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
