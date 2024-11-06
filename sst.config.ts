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
        pnpm dlx @opennextjs/aws build && \
        mkdir -p .open-next/tmp-sharp && \
        pnpm -C='.open-next/tmp-sharp' i sharp --shamefully-hoist --config.arch=${architecture} --config.platform=linux --config.libc=glibc && \
        cp -R .open-next/tmp-sharp/node_modules .open-next/server-functions/default
        `,
      // Note: https://sst.dev/docs/custom-domains/#manual-setup
      // domain: {
      //   name:
      //     $app.stage === 'production' ? 'tvseri.es' : `${$app.stage}.tvseri.es`,
      //   redirects: $app.stage === 'production' ? ['www.tvseri.es'] : undefined,
      //   dns: false,
      //   cert: '',
      // },
      environment: {
        MDBLIST_API_KEY: process.env.MDBLIST_API_KEY as string,
        OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
        SECRET_KEY: process.env.SECRET_KEY as string,
        TMDB_API_ACCESS_TOKEN: process.env.TMDB_API_ACCESS_TOKEN as string,
        TMDB_API_KEY: process.env.TMDB_API_KEY as string,
        SITE_URL: 'https://d1u3k6rlkr0wln.cloudfront.net',
      },
      server: {
        architecture,
        memory: '3008 MB',
      },
      transform: {
        cdn: (options) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const origins = (options.origins || []) as any[];
          options.origins = origins.map((origin) => ({
            ...origin,
            originShield: {
              enabled: true,
              originShieldRegion: $app.providers?.aws.region ?? 'eu-west-2',
            },
          }));
        },
      },
    });
  },
});
