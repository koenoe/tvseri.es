/// <reference path="../.sst/platform/config.d.ts" />

import { apiRouter } from './api';
import { auth } from './auth';
import { domain, zone } from './dns';
import * as secrets from './secrets';

// Note: flag to easily enable or disable WAF
const ENABLE_WAF = true;

let openNextVersion: string | undefined;
try {
  openNextVersion =
    require('../apps/web/package.json').devDependencies?.[
      '@opennextjs/aws'
    ]?.replace('^', '') ?? undefined;
} catch {
  openNextVersion = undefined;
}

// Note: ideally this was called 'web', but if I change it now everything will go bad shittttt
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
          const uri = event.request.uri.toLowerCase();
          const blockedPattern = /\.(php|asp|aspx|jsp|cgi|pl|py|sh|sql|env|config|bak|backup)(\?|$)/;

          if (blockedPattern.test(uri)) {
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
                data: '<html><head><title>403 Forbidden</title></head><body><center><h1>403 Forbidden</h1></center></body></html>'
              }
            };
          }
        `,
    },
  },
  environment: {
    OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
    SITE_URL: `https://${domain}`,
  },
  imageOptimization: {
    staticEtag: true,
  },
  link: [auth, apiRouter, secrets.apiKey, secrets.sessionSecret],
  openNextVersion,
  path: 'apps/web',
  // Note: disable multi region for now as it's not really worth the extra costs
  // regions: [$app.providers?.aws.region ?? 'eu-west-2', 'us-east-1'],
  server: {
    architecture: 'arm64',
    memory: '2048 MB',
    runtime: 'nodejs22.x',
  },
  transform: {
    cdn: (options) => {
      options.transform = {
        distribution(args) {
          if (ENABLE_WAF && $app.stage === 'production') {
            const { webAcl } = require('./waf');
            args.webAclId = webAcl.arn;
          }
        },
      };
    },
    server: {
      // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versionsARM.html
      layers:
        $app.stage === 'production'
          ? [
              'arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension-Arm64:21',
            ]
          : [],
      nodejs: {
        esbuild: {
          external: ['@opennextjs/aws'],
        },
        minify: true,
      },
      timeout: '15 seconds',
    },
  },
  warm: $app.stage === 'production' ? 1 : 0,
});
