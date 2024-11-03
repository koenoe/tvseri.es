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
    new sst.aws.Nextjs('tvseries', {
      server: {
        architecture: 'arm64',
        install: ['sharp'],
      },
    });
  },
});
