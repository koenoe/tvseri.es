/// <reference path="../.sst/platform/config.d.ts" />

import { apiRouter } from './api';
import { auth } from './auth';
import { domain, zone } from './dns';

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
    API_PROXY: $app.stage === 'production' ? undefined : apiRouter.url,
    API_USE_MOCK_DATA: '1',
    VITE_API_URL: $app.stage === 'production' ? apiRouter.url : '/api',
    VITE_AUTH_URL: auth.url,
  },
  path: 'apps/dashboard',
});
