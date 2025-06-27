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
