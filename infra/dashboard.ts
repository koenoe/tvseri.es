/// <reference path="../.sst/platform/config.d.ts" />

import { apiRouter } from './api';
import { auth } from './auth';
import { domain, zone } from './dns';

const PROD_API_URL = 'https://api.tvseri.es';
const PROD_AUTH_URL = 'https://auth.tvseri.es';

const useProdApi = process.env.DASHBOARD_USE_PROD_API === '1';
const useProxy = $app.stage !== 'production' && !$app.stage.startsWith('pr-');

const apiBaseUrl = useProdApi ? PROD_API_URL : apiRouter.url;
const apiProxy = useProxy ? apiBaseUrl : undefined;
const apiUrl = useProxy ? '/api' : apiBaseUrl;
const authUrl = useProdApi ? PROD_AUTH_URL : auth.url;

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
    API_PROXY: apiProxy,
    VITE_API_URL: apiUrl,
    VITE_AUTH_URL: authUrl,
  },
  path: 'apps/dashboard',
});
