/// <reference path="../.sst/platform/config.d.ts" />

export const dominantColor = new sst.aws.Function('DominantColor', {
  handler: 'apps/api/src/lambdas/dominantColor.handler',
  memory: '512 MB',
  nodejs: {
    esbuild: {
      external: [
        '@aws-sdk/client-cloudfront',
        '@aws-sdk/client-dynamodb',
        '@aws-sdk/client-lambda',
        '@aws-sdk/client-sesv2',
        '@aws-sdk/client-sqs',
        '@aws-sdk/util-dynamodb',
        'sharp',
      ],
    },
    install: ['sharp'],
  },
  timeout: '20 seconds',
});
