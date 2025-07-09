/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      home: 'aws',
      name: 'tvseries',
      providers: {
        aws: {
          profile:
            input.stage === 'production'
              ? 'tvseries-production'
              : 'tvseries-dev',
        },
      },
      removal: input?.stage === 'production' ? 'retain' : 'remove',
    };
  },
  async run() {
    // Global transform to apply geographic restrictions to all CloudFront distributions
    $transform(aws.cloudfront.Distribution, (args) => {
      args.restrictions = {
        geoRestriction: {
          locations: ['BY', 'CN', 'CU', 'IR', 'KP', 'RU', 'SG', 'VE'],
          restrictionType: 'blacklist',
        },
      };
    });

    // Global transform to standardize all Lambda functions
    $transform(sst.aws.Function, (args) => {
      args.architecture = 'arm64';
      args.runtime = 'nodejs22.x';
    });

    await import('./infra/dns');
    await import('./infra/email');
    await import('./infra/dominantColor');
    await import('./infra/dynamo');
    await import('./infra/scrobbleQueue');
    await import('./infra/watchedStatus');
    await import('./infra/api');
    await import('./infra/web');
  },
});
