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
      },
    };
  },
  async run() {
    await import('./infra/dns');
    await import('./infra/email');
    await import('./infra/dominantColor');
    await import('./infra/scrobbleQueue');
    await import('./infra/web');
  },
});
