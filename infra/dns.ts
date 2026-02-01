/// <reference path="../.sst/platform/config.d.ts" />

const PRODUCTION = 'tvseri.es';
const DEV = 'dev.tvseri.es';

export const { zone, domain } = (() => {
  const AWS_HOSTED_ZONE_ID_DEV = process.env.AWS_HOSTED_ZONE_ID_DEV as string;

  if ($app.stage === 'production')
    return {
      domain: PRODUCTION,
      zone: process.env.AWS_HOSTED_ZONE_ID_PROD as string,
    };

  if ($app.stage === 'dev')
    return {
      domain: DEV,
      zone: AWS_HOSTED_ZONE_ID_DEV,
    };

  return {
    domain: `${$app.stage}.${DEV}`,
    zone: AWS_HOSTED_ZONE_ID_DEV,
  };
})();

/**
 * CAA (Certificate Authority Authorization) records
 *
 * These records explicitly authorize Amazon/AWS to issue SSL certificates
 * for the domain. Required for ACM certificate validation to succeed.
 *
 * @see https://docs.aws.amazon.com/acm/latest/userguide/troubleshooting-caa.html
 */
new aws.route53.Record('CAARecord', {
  name: domain,
  records: [
    '0 issue "amazon.com"',
    '0 issue "amazontrust.com"',
    '0 issue "awstrust.com"',
    '0 issue "amazonaws.com"',
  ],
  ttl: 300,
  type: 'CAA',
  zoneId: zone,
});
