/// <reference path="../.sst/platform/config.d.ts" />

export const dominantColor = new sst.aws.Function('DominantColor', {
  architecture: 'arm64',
  handler: 'apps/api/src/lambdas/dominantColor.handler',
  memory: '512 MB',
  runtime: 'nodejs22.x',
  timeout: '30 seconds',
  nodejs: {
    install: ['sharp'],
    minify: true,
    esbuild: {
      external: [
        '@aws-sdk/client-dynamodb',
        '@aws-sdk/client-lambda',
        '@aws-sdk/client-sesv2',
        '@aws-sdk/client-sqs',
        '@aws-sdk/util-dynamodb',
      ],
    },
  },
});
