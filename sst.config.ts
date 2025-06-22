/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: 'tvseries',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
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
    };
  },
  async run() {
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
