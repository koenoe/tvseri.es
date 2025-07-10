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

      // biome-ignore lint/suspicious/noExplicitAny: sort out later
      const origins = (args.origins || []) as any[];
      args.origins = origins.map((origin) => ({
        ...origin,
        originShield: {
          enabled: true,
          originShieldRegion: $app.providers?.aws.region ?? 'eu-west-2',
        },
      }));
    });

    // Global transform to standardize all Lambda functions
    $transform(sst.aws.Function, (args) => {
      args.architecture = 'arm64';
      args.runtime = 'nodejs22.x';
      args.layers = [
        'arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension-Arm64:5',
      ];
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
    await import('./infra/watchedStatus');
    await import('./infra/api');
    await import('./infra/web');
  },
});
