/// <reference path="../.sst/platform/config.d.ts" />

import { domain, zone } from './dns';
import * as dynamo from './dynamo';
import { email } from './email';

export const auth = new sst.aws.Auth('Auth', {
  domain: {
    dns: sst.aws.dns({
      zone,
    }),
    name: `auth.${domain}`,
  },
  issuer: {
    handler: 'apps/auth/src/index.handler',
    link: [dynamo.users, email],
    memory: '2048 MB',
    nodejs: {
      esbuild: {
        external: ['@aws-sdk/client-dynamodb', '@aws-sdk/util-dynamodb'],
      },
      loader: {
        '.css': 'text',
      },
    },
    timeout: '30 seconds',
  },
});
