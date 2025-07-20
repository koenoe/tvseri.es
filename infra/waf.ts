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
          block: {},
        },
        name: 'IPRateLimit',
        priority: 0,
        statement: {
          rateBasedStatement: {
            aggregateKeyType: 'IP',
            limit: 1500, // per 5 mins
          },
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'IPRateLimitMetric',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWSManagedBotControlRule',
        overrideAction: {
          none: {},
        },
        priority: 1,
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
            scopeDownStatement: {
              notStatement: {
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
            vendorName: 'AWS',
          },
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AWSManagedRulesBotControlRuleSetMetric',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWSManagedCoreRuleSet',
        overrideAction: {
          none: {},
        },
        priority: 2,
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesCommonRuleSet',
            vendorName: 'AWS',
          },
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AWSManagedRulesCommonRuleSetMetric',
          sampledRequestsEnabled: true,
        },
      },
    ],
    scope: 'CLOUDFRONT',
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: 'WebACLMetrics',
      sampledRequestsEnabled: true,
    },
  },
  {
    provider: wafProvider,
  },
);
