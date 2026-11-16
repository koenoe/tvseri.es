/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      home: 'aws',
      name: 'tvseries',
      protect: input?.stage === 'production',
      providers: {
        '@pulumiverse/time': '0.1.1',
        aws: {
          profile:
            input.stage === 'production'
              ? 'tvseries-production'
              : 'tvseries-dev',
        },
        random: '4.19.2',
        vercel: {
          apiToken: process.env.VERCEL_API_TOKEN,
          team: process.env.VERCEL_TEAM_ID,
          version: '4.6.1',
        },
      },
      removal: input?.stage === 'production' ? 'retain' : 'remove',
    };
  },
  async run() {
    const { blockedCountries } = await import('./infra/blockedCountries');
    const isProduction = $app.stage === 'production';

    // Distributions that skip Origin Shield. The dashboard is an internal,
    // low-traffic static site: Origin Shield only adds per-request cost there.
    // SST names a StaticSite's distribution `${name}CdnDistribution`
    // (infra/dashboard.ts creates the `Dashboard` StaticSite).
    const originShieldExcluded = new Set(['DashboardCdnDistribution']);

    // Global transform to apply geographic restrictions to all CloudFront distributions
    // and enable origin shield (except for the distributions above).
    // Note: this runs after component-level transforms, so the exclusion has to
    // live here; a `transform.cdn` on the StaticSite would be overwritten.
    $transform(aws.cloudfront.Distribution, (args, _opts, name) => {
      args.restrictions = {
        geoRestriction: {
          locations: blockedCountries,
          restrictionType: 'blacklist',
        },
      };

      if (!originShieldExcluded.has(name)) {
        // biome-ignore lint/suspicious/noExplicitAny: sort out later
        const origins = (args.origins || []) as any[];
        args.origins = origins.map((origin) => ({
          ...origin,
          originShield: {
            enabled: true,
            originShieldRegion: $app.providers?.aws.region ?? 'eu-west-2',
          },
        }));
      }

      args.priceClass = 'PriceClass_100';
      args.httpVersion = 'http2and3';
      args.isIpv6Enabled = true;
    });

    // The API Router's viewer-request function: SST ships its own part of the
    // code unminified, which leaves little room under CloudFront's 10 KB
    // function limit, so it's minified at deploy (infra/edgeFunctionMinify.ts).
    $transform(aws.cloudfront.Function, (args, _opts, name) => {
      if (name !== 'ApiRouterCloudfrontFunctionRequest') {
        return;
      }

      args.code = $resolve([args.code]).apply(async ([code]) => {
        const { minifyEdgeFunction } = await import(
          './infra/edgeFunctionMinify'
        );
        return minifyEdgeFunction(code);
      });
    });

    // Every table (the app's and the auth service's) keeps point-in-time
    // recovery explicitly, not only through SST's default, and production
    // tables can't be deleted (in place, no data change). PR stages are
    // removed when the PR closes, so they stay deletable.
    $transform(sst.aws.Dynamo, (args) => {
      args.deletionProtection ??= isProduction;
      const table = args.transform?.table;
      args.transform = {
        ...args.transform,
        table: (tableArgs, opts, name) => {
          tableArgs.pointInTimeRecovery = { enabled: true };
          // Pulumi's protect (engine-side, never sent to AWS, so no change
          // on the tables): a deploy that would delete or replace a
          // production table fails instead. With removal `retain` a replace
          // would otherwise orphan the old table and point the app at a new
          // empty one; deletion protection alone never sees that delete.
          opts.protect = isProduction;
          if (typeof table === 'function') {
            table(tableArgs, opts, name);
          } else if (table) {
            Object.assign(tableArgs, table);
          }
        },
      };
    });

    // Global transform to standardize all Lambda functions
    $transform(sst.aws.Function, (args) => {
      args.architecture = 'arm64';
      args.runtime = 'nodejs24.x';
      // No @aws-sdk/* esbuild externals anywhere: a bundled SDK cold-starts faster than the
      // runtime-provided one (AWS guidance). Compare REPORT "Init Duration" before/after.
      args.nodejs = {
        ...args.nodejs,
        minify: true,
      };
    });

    // Base infrastructure with no dependencies
    await import('./infra/dns');
    await import('./infra/email');
    await import('./infra/dominantColor');
    await import('./infra/dynamo');
    await import('./infra/secrets');
    // One account-wide kill switch is enough; PR stages would each add a budget + cron.
    if (isProduction) {
      await import('./infra/distributionDisabler');
    }

    // Queue consumers that depend on base infrastructure
    // scrobbleQueue: depends on dynamo, dominantColor
    await import('./infra/scrobbleQueue');
    // metrics: depends on dynamo
    await import('./infra/metrics');
    // watchedStatus: depends on dynamo, dominantColor
    await import('./infra/watchedStatus');
    // imports: depends on dynamo
    await import('./infra/imports');
    // deleteAccount: depends on dynamo
    await import('./infra/deleteAccount');

    // Auth service that depends on dns, dynamo, email
    await import('./infra/auth');

    // API router that depends on auth, dns, dynamo, email, dominantColor, metricsQueue, scrobbleQueue, watchedStatusQueue, undoImportQueue, deleteAccountQueue
    await import('./infra/api');

    // Frontend apps that depend on api, auth, dns
    await import('./infra/web');
    await import('./infra/dashboard');
  },
});
