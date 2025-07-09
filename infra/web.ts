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

const defaultRegion = $app.providers?.aws.region ?? 'eu-west-2';

new sst.aws.Nextjs('tvseries', {
  domain: {
    dns: sst.aws.dns({
      zone,
    }),
    name: domain,
    redirects: $app.stage === 'production' ? ['www.tvseri.es'] : [],
  },
  edge: {
    viewerRequest: {
      injection: $interpolate`
          // Geographic blocking for high-risk countries
          const blockedCountries = ['CN', 'RU', 'KP', 'IR', 'BY', 'VE', 'CU', 'SG'];
          const country = event.request.headers['cloudfront-viewer-country'] &&
                         event.request.headers['cloudfront-viewer-country'].value;

          if (country && blockedCountries.includes(country)) {
            return {
              statusCode: 403,
              statusDescription: 'Forbidden',
              headers: {
                'content-type': [{
                  key: 'Content-Type',
                  value: 'text/html'
                }]
              },
              body: {
                encoding: "text",
                data: '<html><head><title>403 Forbidden</title></head><body><center><h1>Access Denied</h1><p>Your region is not supported.</p></center></body></html>'
              }
            }
          }
        `,
    },
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
  regions: [defaultRegion],
  server: {
    architecture: 'arm64',
    memory: '2582 MB',
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
          originShieldRegion: defaultRegion,
        },
      }));

      // WOOF WOOF
      if ($app.stage === 'production') {
        const { webAcl } = require('./waf');
        options.transform = {
          distribution(args) {
            args.webAclId = webAcl.arn;
          },
        };
      }
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
