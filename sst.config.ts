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
      buildCommand: `
        pnpm dlx open-next@3.1.2 build && \
        mkdir -p .open-next/tmp-sharp && \
        pnpm -C='.open-next/tmp-sharp' i sharp --shamefully-hoist --config.arch=arm64 --config.platform=linux --config.libc=glibc && \
        cp -R .open-next/tmp-sharp/node_modules .open-next/server-functions/default
        `,
      server: {
        architecture: 'arm64',
        install: ['sharp'],
        memory: '2048 MB',
      },
    });
  },
});
