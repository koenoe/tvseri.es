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
    VITE_API_URL: apiRouter.url,
    VITE_AUTH_URL: auth.url,
  },
  path: 'apps/dashboard',
});
