/// <reference path="../.sst/platform/config.d.ts" />

import { domain, zone } from './dns';
// import { apiRouter } from './api';
import * as secrets from './secrets';

// const project = new vercel.Project('Website', {
//   buildCommand: 'pnpm run build',
//   devCommand: 'pnpm run dev',
//   framework: 'nextjs',
//   name: 'tvseries',
//   rootDirectory: 'apps/web',
// });

const project = vercel.getProjectOutput({
  name: 'tvseries',
});

const dir = vercel.getProjectDirectoryOutput({
  // path: process.cwd() + '/apps/web',
  path: process.cwd(),
});

if (!$dev) {
  new vercel.Deployment('WebsiteDeployment', {
    projectId: project.id,
    production: $app.stage === 'production',
    files: dir.files,
    pathPrefix: process.cwd(),
    environment: {
      // API_URL: apiRouter.url,
      API_URL: 'https://api.tvseri.es',
      API_KEY: secrets.apiKey.value,
      SECRET_KEY: secrets.secretKey.value,
      SITE_URL: `https://${domain}`,
    },
    projectSettings: {
      buildCommand: 'pnpm run build',
      framework: 'nextjs',
      installCommand: 'pnpm install --frozen-lockfile',
      outputDirectory: '.next',
      rootDirectory: 'apps/web',
    },
  });
} else {
  console.log('Not implemented yet.');
}

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
