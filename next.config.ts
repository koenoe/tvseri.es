import getBaseUrl from './src/utils/getBaseUrl';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // TODO: figure out what broke in latest canary as searchParams aren't working properly anymore
    ppr: false,
    staleTimes: {
      // TODO: there's a bug with searchParams atm
      dynamic: 0, // default is 30
      static: 0, // default is 180
    },
  },
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
    ];
  },
};

export default nextConfig;
