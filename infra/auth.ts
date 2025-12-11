/// <reference path="../.sst/platform/config.d.ts" />

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
    handler: 'apps/auth/src/index.handler',
    // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versionsARM.html
    layers:
      $app.stage === 'production'
        ? [
            'arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension-Arm64:21',
          ]
        : [],
    link: [dynamo.users, email, secrets.googleClientId],
    memory: '1024 MB',
    nodejs: {
      esbuild: {
        external: [
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-sesv2',
          '@aws-sdk/util-dynamodb',
        ],
      },
      loader: {
        '.css': 'text',
      },
    },
    timeout: '15 seconds',
  },
});
