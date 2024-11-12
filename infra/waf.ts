/// <reference path="../.sst/platform/config.d.ts" />

// Create a specific provider for CloudFront WAF (must be in us-east-1)
const wafProvider = new aws.Provider('waf-provider', {
  region: 'us-east-1',
});

// Create WAFv2 WebACL
export const webAcl = new aws.wafv2.WebAcl(
  'webAcl',
  {
    defaultAction: {
      allow: {},
    },
    scope: 'CLOUDFRONT',
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: 'webAcl',
      sampledRequestsEnabled: true,
    },
    rules: [
      {
        name: 'AWSManagedCommonRule',
        priority: 1,
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesCommonRuleSet',
            vendorName: 'AWS',
          },
        },
        overrideAction: {
          none: {},
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AWSManagedCommonRule',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'IPRateLimit',
        priority: 2,
        statement: {
          rateBasedStatement: {
            limit: 2000,
            aggregateKeyType: 'IP',
          },
        },
        action: {
          block: {},
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'IPRateLimit',
          sampledRequestsEnabled: true,
        },
      },
    ],
  },
  {
    provider: wafProvider,
  },
);
