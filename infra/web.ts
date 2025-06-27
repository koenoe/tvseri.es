/// <reference path="../.sst/platform/config.d.ts" />

import { execSync } from 'node:child_process';
import { domain, zone } from './dns';
// import { apiRouter } from './api';
import * as secrets from './secrets';

const gitHash =
  process.env.GITHUB_SHA ||
  execSync('git rev-parse --short HEAD').toString().trim();
const gitBranch =
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

const projectSettings = {
  buildCommand: 'pnpm run build',
  framework: 'nextjs',
  installCommand: 'pnpm install --frozen-lockfile',
  outputDirectory: '.next',
  rootDirectory: 'apps/web',
};

const currentProject = vercel.getProjectOutput({
  name: 'web',
});

const project = currentProject
  ? currentProject
  : new vercel.Project('WebProject', {
      gitRepository: {
        repo: 'koenoe/tvseries',
        type: 'github',
      },
      name: 'web',
      ...projectSettings,
    });

export const web = new vercel.Deployment('WebDeployment', {
  environment: {
    API_KEY: secrets.apiKey.value,
    // API_URL: apiRouter.url,
    API_URL: 'https://api.tvseri.es',
    GIT_BRANCH: gitBranch,
    GIT_HASH: gitHash,
    SECRET_KEY: secrets.secretKey.value,
    SITE_URL: `https://${domain}`,
    SST_STAGE: $app.stage,
  },
  production: $app.stage === 'production',
  projectId: project.id,
  projectSettings,
  ref: $app.stage === 'production' ? gitHash : gitBranch,
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

let openNextVersion: string | undefined;
try {
  openNextVersion =
    require('../apps/web/package.json').devDependencies?.[
      '@opennextjs/aws'
    ]?.replace('^', '') ?? undefined;
} catch {
  openNextVersion = undefined;
}

new sst.aws.Nextjs('tvseries', {
  domain: {
    dns: sst.aws.dns({
      zone,
    }),
    name: domain,
    redirects: $app.stage === 'production' ? ['www.tvseri.es'] : [],
  },
  environment: {
    API_KEY: secrets.apiKey.value,
    // API_URL: apiRouter.url,
    API_URL: 'https://api.tvseri.es',
    OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
    SECRET_KEY: secrets.secretKey.value,
    SITE_URL: `https://${domain}`,
  },
  imageOptimization: {
    memory: '512 MB',
    staticEtag: true,
  },
  openNextVersion,
  path: 'apps/web',
  server: {
    architecture: 'arm64',
    memory: '1 GB',
    runtime: 'nodejs22.x',
  },
  transform: {
    cdn: (options) => {
      // biome-ignore lint/suspicious/noExplicitAny: sort out later
      const origins = (options.origins || []) as any[];
      options.origins = origins.map((origin) => ({
        ...origin,
        originShield: {
          enabled: true,
          originShieldRegion: $app.providers?.aws.region ?? 'eu-west-2',
        },
      }));
    },
    server: {
      nodejs: {
        esbuild: {
          external: ['@opennextjs/aws'],
        },
        minify: true,
      },
      timeout: '30 seconds',
    },
  },
  warm: $app.stage === 'production' ? 3 : 0,
});
