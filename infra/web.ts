/// <reference path="../.sst/platform/config.d.ts" />

import { domain, zone } from './dns';
// import { apiRouter } from './api';
import * as secrets from './secrets';

const project = vercel.getProjectOutput({
  name: 'web',
});

export const web = new vercel.Deployment('WebDeployment', {
  projectId: project.id,
  production: $app.stage === 'production',
  ref:
    $app.stage === 'production'
      ? process.env.GITHUB_SHA
      : process.env.GITHUB_REF_NAME,
  environment: {
    // API_URL: apiRouter.url,
    API_URL: 'https://api.tvseri.es',
    API_KEY: secrets.apiKey.value,
    SECRET_KEY: secrets.secretKey.value,
    SITE_URL: `https://${domain}`,
    SST_STAGE: $app.stage,
  },
  projectSettings: {
    buildCommand: 'pnpm run build',
    framework: 'nextjs',
    installCommand: 'pnpm install --frozen-lockfile',
    outputDirectory: '.next',
    rootDirectory: 'apps/web',
  },
});

// if (!$dev) {
//   new vercel.Deployment('MstrV2DashboardVercel', {
//     projectId: project.id,
//     production: isProd,
//     ref: isProd ? gitHash : gitBranch,
//     projectSettings: {
//       buildCommand: 'pnpm run build',
//       framework: 'nextjs',
//       rootDirectory: 'apps/masterfile/dashboard',
//     },
//     // Using this to force a redeploy when the git hash changes
//     environment: {
//       GIT_HASH: gitHash,
//     },
//   });
// }

// new sst.aws.Nextjs('tvseries', {
//   domain: {
//     name: domain,
//     redirects: $app.stage === 'production' ? ['www.tvseri.es'] : [],
//     dns: sst.aws.dns({
//       zone,
//     }),
//   },
//   environment: {
//     API_URL: apiRouter.url,
//     OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
//     SITE_URL: `https://${domain}`,
//   },
//   imageOptimization: {
//     memory: '512 MB',
//     staticEtag: true,
//   },
//   link: [secrets.apiKey, secrets.secretKey],
//   path: 'apps/web',
//   server: {
//     architecture: 'arm64',
//     memory: '1 GB',
//     runtime: 'nodejs22.x',
//   },
//   warm: 3,
//   transform: {
//     server: {
//       timeout: '30 seconds',
//       nodejs: {
//         minify: true,
//         esbuild: {
//           external: ['@opennextjs/aws'],
//         },
//       },
//     },
//     cdn: (options) => {
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const origins = (options.origins || []) as any[];
//       options.origins = origins.map((origin) => ({
//         ...origin,
//         originShield: {
//           enabled: true,
//           originShieldRegion: $app.providers?.aws.region ?? 'eu-west-2',
//         },
//       }));
//     },
//   },
// });
