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
    const { lists, preferredImages, sessions, users } = await import(
      './infra/dynamo'
    );
    const architecture = 'arm64';
    const domain =
      $app.stage === 'production'
        ? 'tvseri.es'
        : `${$app.stage === 'dev' || $app.stage === 'development' ? 'dev' : `${$app.stage}.dev`}.tvseri.es`;

    new sst.aws.Nextjs('tvseries', {
      buildCommand: `
        pnpm dlx @opennextjs/aws build && \
        mkdir -p .open-next/tmp-sharp && \
        pnpm -C='.open-next/tmp-sharp' i sharp --shamefully-hoist --config.arch=${architecture} --config.platform=linux --config.libc=glibc && \
        cp -R .open-next/tmp-sharp/node_modules .open-next/server-functions/default
        `,
      domain: {
        name: domain,
        dns: sst.aws.dns({
          zone:
            $app.stage === 'production'
              ? (process.env.AWS_HOSTED_ZONE_ID_PROD as string)
              : (process.env.AWS_HOSTED_ZONE_ID_DEV as string),
        }),
        redirects: $app.stage === 'production' ? ['www.tvseri.es'] : [],
      },
      environment: {
        MDBLIST_API_KEY: process.env.MDBLIST_API_KEY as string,
        OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
        SECRET_KEY: process.env.SECRET_KEY as string,
        TMDB_API_ACCESS_TOKEN: process.env.TMDB_API_ACCESS_TOKEN as string,
        TMDB_API_KEY: process.env.TMDB_API_KEY as string,
        SITE_URL: `https://${domain}`,
      },
      link: [lists, preferredImages, sessions, users],
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
