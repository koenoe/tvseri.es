/// <reference path="./.sst/platform/config.d.ts" />

import { blockedCountries } from './infra/blockedCountries';

export default $config({
  app(input) {
    return {
      home: 'aws',
      name: 'tvseries',
      providers: {
        '@pulumiverse/time': true,
        aws: {
          profile:
            input.stage === 'production'
              ? 'tvseries-production'
              : 'tvseries-dev',
        },
        random: true,
      },
      removal: input?.stage === 'production' ? 'retain' : 'remove',
    };
  },
  async run() {
    // Global transform to apply geographic restrictions to all CloudFront distributions
    // and enable origin shield
    $transform(aws.cloudfront.Distribution, (args) => {
      args.restrictions = {
        geoRestriction: {
          locations: blockedCountries,
          restrictionType: 'blacklist',
        },
      };

      // biome-ignore lint/suspicious/noExplicitAny: sort out later
      const origins = (args.origins || []) as any[];
      args.origins = origins.map((origin) => ({
        ...origin,
        originShield: {
          enabled: true,
          originShieldRegion: $app.providers?.aws.region ?? 'eu-west-2',
        },
      }));

      args.priceClass = 'PriceClass_100';
    });

    // Global transform to standardize all Lambda functions
    $transform(sst.aws.Function, (args) => {
      args.architecture = 'arm64';
      args.runtime = 'nodejs22.x';
      args.nodejs = {
        ...args.nodejs,
        minify: true,
      };
    });

    await import('./infra/dns');
    await import('./infra/email');
    await import('./infra/dominantColor');
    await import('./infra/dynamo');
    await import('./infra/scrobbleQueue');
    await import('./infra/metrics');
    await import('./infra/watchedStatus');
    await import('./infra/auth');
    await import('./infra/api');
    await import('./infra/web');
    await import('./infra/distributionDisabler');
  },
});
