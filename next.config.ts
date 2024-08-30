import getBaseUrl from './src/utils/getBaseUrl';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true,
    pprFallbacks: true,
    staleTimes: {
      // TODO: there's a bug with searchParams atm
      dynamic: 0, // default is 30
      static: 0, // default is 180
    },
  },
  images: {
    deviceSizes: [640, 1200, 1920],
    imageSizes: [128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: getBaseUrl(),
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
