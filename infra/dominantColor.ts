/// <reference path="../.sst/platform/config.d.ts" />

export const dominantColor = new sst.aws.Function('DominantColor', {
  architecture: 'arm64',
  handler: 'src/lambdas/dominantColor.handler',
  memory: '512 MB',
  runtime: 'nodejs22.x',
  timeout: '30 seconds',
  nodejs: {
    install: ['@better-fetch/fetch', 'color', 'sharp'],
    minify: true,
  },
});
