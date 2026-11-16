/// <reference path="../.sst/platform/config.d.ts" />

import { productionReserved } from './concurrency';
import { domain, zone } from './dns';
import * as dynamo from './dynamo';
import { email } from './email';
import * as secrets from './secrets';

export const auth = new sst.aws.Auth('Auth', {
  domain: {
    dns: sst.aws.dns({
      zone,
    }),
    name: `auth.${domain}`,
  },
  forceUpgrade: 'v2',
  issuer: {
    // Caps the public issuer (logins + token refreshes) against abuse; 20 is
    // ample for current traffic.
    concurrency: {
      reserved: productionReserved($app.stage, 20),
    },
    // The issuer can't derive the stage's base domain itself; infra/dns.ts is the source of truth.
    environment: {
      BASE_DOMAIN: domain,
    },
    handler: 'apps/auth/src/index.handler',
    link: [dynamo.users, email, secrets.googleClientId],
    memory: '1024 MB',
    nodejs: {
      loader: {
        '.css': 'text',
        // The self-hosted Inter for the sign-in pages (apps/auth/src/ui/assets.ts)
        '.woff2': 'binary',
      },
    },
    timeout: '15 seconds',
  },
});
