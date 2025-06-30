/// <reference path="../.sst/platform/config.d.ts" />

import { apiRouter } from './api';
import { domain, zone } from './dns';
import * as secrets from './secrets';

let openNextVersion: string | undefined;
try {
  openNextVersion =
    require('../apps/web/package.json').devDependencies?.[
      '@opennextjs/aws'
    ]?.replace('^', '') ?? undefined;
} catch {
  openNextVersion = undefined;
}

new sst.aws.Nextjs('tvseries', {
  domain: {
    dns: sst.aws.dns({
      zone,
    }),
    name: domain,
    redirects: $app.stage === 'production' ? ['www.tvseri.es'] : [],
  },
  environment: {
    API_URL: apiRouter.url,
    OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
    SITE_URL: `https://${domain}`,
  },
  imageOptimization: {
    staticEtag: true,
  },
  link: [secrets.apiKey, secrets.secretKey],
  openNextVersion,
  path: 'apps/web',
  server: {
    architecture: 'arm64',
    memory: '3008 MB',
    runtime: 'nodejs22.x',
  },
  transform: {
    cdn: (options) => {
      // biome-ignore lint/suspicious/noExplicitAny: sort out later
      const origins = (options.origins || []) as any[];
      options.origins = origins.map((origin) => ({
        ...origin,
        originShield: {
          enabled: true,
          originShieldRegion: $app.providers?.aws.region ?? 'eu-west-2',
        },
      }));
    },
    server: {
      nodejs: {
        esbuild: {
          external: ['@opennextjs/aws'],
        },
        minify: true,
      },
      timeout: '30 seconds',
    },
  },
  warm: $app.stage === 'production' ? 3 : 0,
});
