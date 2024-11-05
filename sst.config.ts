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
    const architecture = 'arm64';

    new sst.aws.Nextjs('tvseries', {
      buildCommand: `
        pnpm dlx open-next build && \
        mkdir -p .open-next/tmp-sharp && \
        pnpm -C='.open-next/tmp-sharp' i sharp --shamefully-hoist --config.arch=${architecture} --config.platform=linux --config.libc=glibc && \
        cp -R .open-next/tmp-sharp/node_modules .open-next/server-functions/default
        `,
      environment: {
        MDBLIST_API_KEY: process.env.MDBLIST_API_KEY as string,
        OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
        SECRET_KEY: process.env.SECRET_KEY as string,
        TMDB_API_ACCESS_TOKEN: process.env.TMDB_API_ACCESS_TOKEN as string,
        TMDB_API_KEY: process.env.TMDB_API_KEY as string,
        // TODO: figure out how to get the site url here
        SST_URL: 'https://d1ygseoktoojlh.cloudfront.net',
      },
      server: {
        architecture,
        memory: '3008 MB',
      },
    });
  },
});
