/// <reference path="../.sst/platform/config.d.ts" />

import { AUTH_EDGE_KEY_HEADER } from '../packages/constants/src/authEdge';
import { productionReserved } from './concurrency';
import { domain, zone } from './dns';
import * as dynamo from './dynamo';
import { email } from './email';
import * as secrets from './secrets';

/**
 * The public issuer's share of the Users table: reading users and creating
 * one (a transaction of conditional puts, authorised per put), not the
 * whole table
 */
const authUsers = new sst.Linkable('AuthUsers', {
  include: [
    sst.aws.permission({
      actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
      resources: [dynamo.users.arn, $interpolate`${dynamo.users.arn}/index/*`],
    }),
  ],
  properties: {
    name: dynamo.users.name,
  },
});

/**
 * Sending the sign-in code, not managing SES. Any identity of the account:
 * an account in the SES sandbox also checks the recipient's identity.
 */
const authEmail = new sst.Linkable('AuthEmail', {
  include: [
    sst.aws.permission({
      actions: ['ses:SendEmail'],
      resources: [
        $interpolate`arn:aws:ses:${aws.getRegionOutput().region}:${aws.getCallerIdentityOutput().accountId}:identity/*`,
        email.nodes.configurationSet.arn,
      ],
    }),
  ],
  properties: {
    sender: email.sender,
  },
});

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
    link: [authEmail, authUsers, secrets.authEdgeKey, secrets.googleClientId],
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
  transform: {
    // The edge key on every request through CloudFront, replacing any copy
    // the browser sent: the issuer then believes CloudFront-Viewer-Address
    // (forwarded by SST's origin request policy) for its code send cap
    // (apps/auth/src/lib/sendLimits.ts).
    router: (args) => {
      args.edge = {
        viewerRequest: {
          injection: $resolve([secrets.authEdgeKeyRandom.result]).apply(
            ([key]) =>
              `event.request.headers[${JSON.stringify(AUTH_EDGE_KEY_HEADER)}] = { value: ${JSON.stringify(key)} };`,
          ),
        },
      };
    },
  },
});
