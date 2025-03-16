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
        name: 'GeoBlockHighRiskCountries',
        priority: 0,
        statement: {
          geoMatchStatement: {
            countryCodes: [
              'RU', // Russia
              'CN', // China
              'KP', // North Korea
              'IR', // Iran
              'BY', // Belarus
              'IN', // India
              'PK', // Pakistan
              'TR', // Turkey
              'TW', // Taiwan
              'BD', // Bangladesh
            ],
          },
        },
        action: {
          block: {},
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'GeoBlockHighRiskCountries',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWSManagedBotControlRule',
        priority: 1,
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesBotControlRuleSet',
            vendorName: 'AWS',
            managedRuleGroupConfigs: [
              {
                awsManagedRulesBotControlRuleSet: {
                  inspectionLevel: 'COMMON',
                },
              },
            ],
          },
        },
        overrideAction: {
          none: {},
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AWSManagedBotControlRule',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWSManagedCommonRule',
        priority: 2,
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
        priority: 3,
        statement: {
          rateBasedStatement: {
            limit: 1500,
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
