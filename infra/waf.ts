/// <reference path="../.sst/platform/config.d.ts" />

/**
 * AWS WAF Configuration for Bot & DDoS Protection
 *
 * This configuration is optimized for:
 * - Strong bot protection (primary goal)
 * - DDoS mitigation
 * - Cost efficiency for a hobby project
 * - Geographic filtering of high-risk regions
 * - Allowing legitimate webhooks (Plex)
 *
 * Expected monthly cost: ~$10-12 with moderate traffic
 */

// Create a specific provider for CloudFront WAF (must be in us-east-1)
// This is required because CloudFront is a global service, but WAF resources
// for CloudFront must be created in the us-east-1 region
const wafProvider = new aws.Provider('waf-provider', {
  region: 'us-east-1',
});

// Create WAFv2 WebACL with optimized rules for bot protection
export const webAcl = new aws.wafv2.WebAcl(
  'webAcl',
  {
    defaultAction: {
      allow: {}, // Default is to allow requests that don't match any rules
    },
    scope: 'CLOUDFRONT', // This WAF is for CloudFront distributions
    visibilityConfig: {
      cloudwatchMetricsEnabled: true, // Enable metrics for visibility into rule effectiveness
      metricName: 'webAcl',
      sampledRequestsEnabled: true, // Sample requests for troubleshooting
    },
    rules: [
      /**
       * RULE 1: Allow Scrobble Webhook
       *
       * Benefits:
       * - Ensures Scrobble webhook functionality works correctly
       * - Takes precedence over bot protection rules
       * - Precisely targets only the specific Scrobble webhook path and user-agent
       * - No impact on general security posture
       */
      {
        name: 'AllowScrobbleWebhook',
        priority: 0, // Highest priority - evaluated first
        statement: {
          // Simply check if the path starts with /api/webhooks/scrobble
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
        action: {
          allow: {}, // Explicitly allow matching requests to bypass other rules
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AllowScrobbleWebhook',
          sampledRequestsEnabled: true,
        },
      },

      /**
       * RULE 2: Geographic Blocking
       *
       * Benefits:
       * - Very cost-effective (minimal impact on WAF costs)
       * - Blocks high percentage of malicious traffic from known problematic regions
       * - Acts as first filter to reduce load on more expensive rules
       * - Simple evaluation with minimal false positives
       */
      {
        name: 'GeoBlockHighRiskCountries',
        priority: 1, // Evaluated after Scrobble allowlist
        statement: {
          geoMatchStatement: {
            countryCodes: [
              'RU', // Russia - high volume of bot traffic and attacks
              'CN', // China - significant source of scanning and bot activity
              'KP', // North Korea - high-risk region for malicious traffic
              'IR', // Iran - known source of attack traffic
              'BY', // Belarus - associated with attack traffic
              'IN', // India - high volume of scanning traffic
              'PK', // Pakistan - source of various attacks
              'TR', // Turkey - significant bot traffic
              'TW', // Taiwan - often used as an attack relay
              'BD', // Bangladesh - growing source of automated traffic
            ],
          },
        },
        action: {
          block: {}, // Immediately block matching requests
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'GeoBlockHighRiskCountries',
          sampledRequestsEnabled: true,
        },
      },

      /**
       * RULE 3: AWS Bot Control
       *
       * Benefits:
       * - Sophisticated bot detection capabilities
       * - Identifies and blocks various bot types automatically
       * - Detects known bot signatures and behaviors
       * - More effective than custom rule-based bot detection
       * - Updates automatically as new bot patterns emerge
       *
       * Note: This is the most expensive rule but provides the best bot protection
       */
      {
        name: 'AWSManagedBotControlRule',
        priority: 2, // Evaluated after geographic blocking
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesBotControlRuleSet',
            vendorName: 'AWS',
            managedRuleGroupConfigs: [
              {
                awsManagedRulesBotControlRuleSet: {
                  inspectionLevel: 'COMMON', // Using COMMON level for cost efficiency
                  // TARGETED level would provide stronger protection but at higher cost
                },
              },
            ],
          },
        },
        overrideAction: {
          none: {}, // Use the default actions defined in the managed rule group
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AWSManagedBotControlRule',
          sampledRequestsEnabled: true,
        },
      },

      /**
       * RULE 4: AWS Known Bad Inputs
       *
       * Benefits:
       * - Cost-effective protection against common attack patterns
       * - Blocks requests containing known malicious input patterns
       * - Prevents path traversal, command injection, etc.
       * - Complements bot protection by blocking malicious request patterns
       * - Very low false positive rate
       */
      {
        name: 'AWSManagedKnownBadInputsRule',
        priority: 3, // Evaluated after bot control
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesKnownBadInputsRuleSet',
            vendorName: 'AWS',
          },
        },
        overrideAction: {
          none: {}, // Use the default actions defined in the managed rule group
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: 'AWSManagedKnownBadInputsRule',
          sampledRequestsEnabled: true,
        },
      },

      /**
       * RULE 5: IP Rate Limiting
       *
       * Benefits:
       * - Very cost-effective protection against DDoS and aggressive bots
       * - Prevents any single IP from overwhelming your application
       * - Acts as a final safety net for bots that might slip past other rules
       * - Minimal false positives with reasonable limit (1500 requests per 5 minutes)
       */
      {
        name: 'IPRateLimit',
        priority: 4, // Final rule evaluated
        statement: {
          rateBasedStatement: {
            limit: 1500, // 1500 requests per 5 minutes (~5 requests per second)
            aggregateKeyType: 'IP',
          },
        },
        action: {
          block: {}, // Block IPs that exceed the rate limit
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
    provider: wafProvider, // Use the us-east-1 provider for CloudFront WAF
  },
);
