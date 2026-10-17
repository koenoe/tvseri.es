/// <reference path="../.sst/platform/config.d.ts" />

export const dominantColor = new sst.aws.Function('DominantColor', {
  handler: 'apps/api/src/lambdas/dominantColor.handler',
  // sharp decode/resize is CPU-bound; 1024 MB gets ~2x the CPU of 512 MB.
  memory: '1024 MB',
  nodejs: {
    esbuild: {
      external: ['sharp'],
    },
    install: ['sharp'],
  },
  timeout: '10 seconds',
});
