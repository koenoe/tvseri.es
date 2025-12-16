/// <reference path="../.sst/platform/config.d.ts" />

import { apiRouter } from './api';
import { auth } from './auth';
import { domain, zone } from './dns';

const useProdApi = process.env.DASHBOARD_USE_PROD_API === '1';

new sst.aws.StaticSite('Dashboard', {
  build: {
    command: 'pnpm run build',
    output: 'dist',
  },
  dev: {
    command: 'pnpm run dev',
  },
  domain: {
    dns: sst.aws.dns({
      zone,
    }),
    name: `dashboard.${domain}`,
  },
  environment: {
    API_PROXY: useProdApi ? 'https://api.tvseri.es' : apiRouter.url,
    VITE_API_URL: '/api',
    VITE_AUTH_URL: useProdApi ? 'https://auth.tvseri.es' : auth.url,
  },
  path: 'apps/dashboard',
});
