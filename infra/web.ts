/// <reference path="../.sst/platform/config.d.ts" />

import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { email } from './email';
import { scrobbleQueue } from './scrobbleQueue';

new sst.aws.Nextjs('tvseries', {
  // buildCommand: 'pnpm dlx @opennextjs/aws build',
  domain: {
    name: domain,
    redirects: $app.stage === 'production' ? ['www.tvseri.es'] : [],
    dns: sst.aws.dns({
      zone,
    }),
  },
  environment: {
    MDBLIST_API_KEY: process.env.MDBLIST_API_KEY as string,
    OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
    SECRET_KEY: process.env.SECRET_KEY as string,
    TMDB_API_ACCESS_TOKEN: process.env.TMDB_API_ACCESS_TOKEN as string,
    TMDB_API_KEY: process.env.TMDB_API_KEY as string,
    SITE_URL: `https://${domain}`,
  },
  imageOptimization: {
    memory: '512 MB',
    staticEtag: true,
  },
  link: [
    dominantColor,
    dynamo.cache,
    dynamo.follow,
    dynamo.lists,
    dynamo.otp,
    dynamo.preferredImages,
    dynamo.sessions,
    dynamo.users,
    dynamo.watched,
    dynamo.webhookTokens,
    email,
    scrobbleQueue,
  ],
  path: 'apps/web',
  server: {
    architecture: 'arm64',
    memory: '512 MB',
    runtime: 'nodejs22.x',
  },
  transform: {
    server: {
      timeout: '30 seconds',
    },
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
