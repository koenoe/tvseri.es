/// <reference path="../.sst/platform/config.d.ts" />

const wafProvider = new aws.Provider('waf-provider', {
  region: 'us-east-1',
});

export const webAcl = new aws.wafv2.WebAcl(
  'webAcl',
  {
    defaultAction: {
      allow: {},
    },
    rules: [
      {
        action: {
          allow: {},
        },
        name: 'AllowSpecificPaths',
        priority: 0,
        statement: {
          orStatement: {
            statements: [
              {
                byteMatchStatement: {
                  fieldToMatch: {
                    uriPath: {},
                  },
                  positionalConstraint: 'STARTS_WITH',
                  searchString: '/api/webhooks/scrobble',
                  textTransformations: [
                    {
                      priority: 0,
                      type: 'NONE',
                    },
                  ],
                },
              },
              {
                byteMatchStatement: {
                  fieldToMatch: {
                    uriPath: {},
                  },
                  positionalConstraint: 'EXACTLY',
                  searchString: '/robots.txt',
                  textTransformations: [
                    {
                      priority: 0,
                      type: 'NONE',
                    },
                  ],
                },
              },
            ],
          },
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AllowSpecificPaths',
          sampledRequestsEnabled: true,
        },
      },
      {
        action: {
          block: {},
        },
        name: 'IPRateLimit',
        priority: 1,
        statement: {
          rateBasedStatement: {
            aggregateKeyType: 'IP',
            limit: 2000, // per 5 mins
          },
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'IPRateLimit',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWSManagedBotControlRule',
        overrideAction: {
          none: {},
        },
        priority: 2,
        statement: {
          managedRuleGroupStatement: {
            managedRuleGroupConfigs: [
              {
                awsManagedRulesBotControlRuleSet: {
                  inspectionLevel: 'COMMON',
                },
              },
            ],
            name: 'AWSManagedRulesBotControlRuleSet',
            vendorName: 'AWS',
          },
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AWSManagedBotControlRule',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWSManagedCoreRuleSet',
        overrideAction: {
          none: {},
        },
        priority: 3,
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesCommonRuleSet',
            vendorName: 'AWS',
          },
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AWSManagedCoreRuleSet',
          sampledRequestsEnabled: true,
        },
      },
    ],
    scope: 'CLOUDFRONT',
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: 'webAcl',
      sampledRequestsEnabled: true,
    },
  },
  {
    provider: wafProvider,
  },
);
