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
        vercel: {
          apiToken: process.env.VERCEL_API_TOKEN,
          team: process.env.VERCEL_TEAM_ID,
        },
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
          locations: [
            'BD', // Bangladesh - high bot traffic
            'BY', // Belarus - sanctions/compliance
            'CN', // China - bot traffic and compliance
            'CU', // Cuba - sanctions/compliance
            'ID', // Indonesia - high bot traffic
            'IN', // India - high bot traffic
            'IR', // Iran - sanctions/compliance
            'KP', // North Korea - sanctions/compliance
            'PK', // Pakistan - high bot traffic
            'RU', // Russia - sanctions/compliance
            'SG', // Singapore - bot traffic
            'TR', // Turkey - problematic traffic
            'UA', // Ukraine - current situation/mixed traffic
            'VE', // Venezuela - sanctions/compliance
          ],
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

    const { apiRouter: api } = await import('./infra/api');
    const { web } = await import('./infra/web');

    return {
      api: api.url,
      web: web.url,
    };
  },
});
