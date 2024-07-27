/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true,
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
