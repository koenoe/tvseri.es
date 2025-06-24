/// <reference path="../.sst/platform/config.d.ts" />

import { execSync } from 'child_process';
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
      name: 'web',
      gitRepository: {
        type: 'github',
        repo: 'koenoe/tvseries',
      },
      ...projectSettings,
    });

export const web = new vercel.Deployment('WebDeployment', {
  projectId: project.id,
  production: $app.stage === 'production',
  ref: $app.stage === 'production' ? gitHash : gitBranch,
  environment: {
    // API_URL: apiRouter.url,
    API_URL: 'https://api.tvseri.es',
    API_KEY: secrets.apiKey.value,
    SECRET_KEY: secrets.secretKey.value,
    SITE_URL: `https://${domain}`,
    SST_STAGE: $app.stage,
    GIT_HASH: gitHash,
    GIT_BRANCH: gitBranch,
  },
  projectSettings,
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
