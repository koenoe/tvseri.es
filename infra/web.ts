/// <reference path="../.sst/platform/config.d.ts" />

import { execSync } from 'node:child_process';
import { domain, zone } from './dns';
import * as secrets from './secrets';

const ENABLE_WAF = false;

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
  edge: {
    viewerRequest: {
      injection: $interpolate`
          const uri = event.request.uri.toLowerCase();
          const blockedPattern = /\.(php|asp|aspx|jsp|cgi|pl|py|sh|sql|env|config|bak|backup)(\?|$)/;

          if (blockedPattern.test(uri)) {
            return {
              statusCode: 403,
              statusDescription: 'Forbidden',
              headers: {
                'content-type': [{
                  key: 'Content-Type',
                  value: 'text/html'
                }]
              },
              body: {
                encoding: "text",
                data: '<html><head><title>403 Forbidden</title></head><body><center><h1>403 Forbidden</h1></center></body></html>'
              }
            };
          }
        `,
    },
  },
  environment: {
    API_KEY: secrets.apiKey.value,
    API_URL: 'https://api.tvseri.es',
    OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE: 'true',
    SECRET_KEY: secrets.secretKey.value,
    SITE_URL: `https://${domain}`,
  },
  imageOptimization: {
    staticEtag: true,
  },
  openNextVersion,
  path: 'apps/web',
  // Note: disable multi region for now as it's not really worth the extra costs
  // regions: [$app.providers?.aws.region ?? 'eu-west-2', 'us-east-1'],
  server: {
    architecture: 'arm64',
    memory: '2582 MB',
    runtime: 'nodejs22.x',
  },
  transform: {
    cdn: (options) => {
      options.transform = {
        distribution(args) {
          if (ENABLE_WAF && $app.stage === 'production') {
            const { webAcl } = require('./waf');
            args.webAclId = webAcl.arn;
          }
        },
      };
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
