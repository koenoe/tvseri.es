/// <reference path="../.sst/platform/config.d.ts" />

/**
 * WAF Configuration for CloudFront
 *
 * Uses 4 FREE AWS Managed Rule Groups:
 * - IP Reputation List: Blocks known malicious IPs, DDoS sources
 * - Known Bad Inputs: Blocks Log4j, Java deserialization, etc.
 * - Common Rule Set: OWASP Top 10 protections
 * - Anonymous IP List: Blocks VPNs, proxies, Tor exit nodes
 *
 * Excluded paths (never blocked):
 * - /api/webhooks/scrobble (external service webhooks)
 * - /robots.txt (search engine crawlers)
 */

const wafProvider = new aws.Provider('waf-provider', {
  region: 'us-east-1',
});

// -----------------------------------------------------------------------------
// Path Exclusions
// These paths are excluded from WAF rules to allow legitimate traffic
// -----------------------------------------------------------------------------

const excludedPaths = {
  robotsTxt: {
    byteMatchStatement: {
      fieldToMatch: { uriPath: {} },
      positionalConstraint: 'EXACTLY',
      searchString: '/robots.txt',
      textTransformations: [{ priority: 0, type: 'NONE' }],
    },
  },
  scrobbleWebhook: {
    byteMatchStatement: {
      fieldToMatch: { uriPath: {} },
      positionalConstraint: 'STARTS_WITH',
      searchString: '/api/webhooks/scrobble',
      textTransformations: [{ priority: 0, type: 'NONE' }],
    },
  },
};

// Scope down statement that excludes both paths from rule evaluation
const excludeProtectedPaths = {
  andStatement: {
    statements: [
      { notStatement: { statements: [excludedPaths.scrobbleWebhook] } },
      { notStatement: { statements: [excludedPaths.robotsTxt] } },
    ],
  },
};

// -----------------------------------------------------------------------------
// Helper to create managed rule group config
// -----------------------------------------------------------------------------

type ManagedRuleConfig = {
  metricName: string;
  name: string;
  priority: number;
  ruleActionOverrides?: Array<{
    actionToUse: { allow?: object; count?: object };
    name: string;
  }>;
  ruleName: string;
};

const createManagedRule = ({
  metricName,
  name,
  priority,
  ruleActionOverrides,
  ruleName,
}: ManagedRuleConfig) => ({
  name,
  overrideAction: { none: {} },
  priority,
  statement: {
    managedRuleGroupStatement: {
      name: ruleName,
      ...(ruleActionOverrides && { ruleActionOverrides }),
      scopeDownStatement: excludeProtectedPaths,
      vendorName: 'AWS',
    },
  },
  visibilityConfig: {
    cloudwatchMetricsEnabled: true,
    metricName,
    sampledRequestsEnabled: true,
  },
});

// -----------------------------------------------------------------------------
// WAF Web ACL
// -----------------------------------------------------------------------------

export const webAcl = new aws.wafv2.WebAcl(
  'webAcl',
  {
    defaultAction: { allow: {} },
    rules: [
      // Blocks known malicious IPs and DDoS sources
      createManagedRule({
        metricName: 'IPReputationList',
        name: 'IPReputationList',
        priority: 0,
        ruleName: 'AWSManagedRulesAmazonIpReputationList',
      }),

      // Blocks Log4j exploits, Java deserialization attacks, etc.
      createManagedRule({
        metricName: 'KnownBadInputs',
        name: 'KnownBadInputs',
        priority: 1,
        ruleName: 'AWSManagedRulesKnownBadInputsRuleSet',
      }),

      // OWASP Top 10 protections (XSS, SQLi, etc.)
      // SizeRestrictions_BODY allowed to prevent false positives on large POST bodies
      createManagedRule({
        metricName: 'CoreRuleSet',
        name: 'CoreRuleSet',
        priority: 2,
        ruleActionOverrides: [
          { actionToUse: { allow: {} }, name: 'SizeRestrictions_BODY' },
        ],
        ruleName: 'AWSManagedRulesCommonRuleSet',
      }),

      // Blocks anonymous proxies, VPNs, Tor exit nodes
      // HostingProviderIPList set to count-only to avoid blocking legitimate cloud services
      createManagedRule({
        metricName: 'AnonymousIPList',
        name: 'AnonymousIPList',
        priority: 3,
        ruleActionOverrides: [
          { actionToUse: { count: {} }, name: 'HostingProviderIPList' },
        ],
        ruleName: 'AWSManagedRulesAnonymousIpList',
      }),
    ],
    scope: 'CLOUDFRONT',
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: 'WebACL',
      sampledRequestsEnabled: true,
    },
  },
  { provider: wafProvider },
);
