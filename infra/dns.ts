/// <reference path="../.sst/platform/config.d.ts" />

const PRODUCTION = 'tvseri.es';
const DEV = 'dev.tvseri.es';

export const { zone, domain } = (() => {
  const AWS_HOSTED_ZONE_ID_DEV = process.env.AWS_HOSTED_ZONE_ID_DEV as string;

  if ($app.stage === 'production')
    return {
      zone: new aws.route53.Zone(
        'Zone',
        {
          name: PRODUCTION,
        },
        {
          retainOnDelete: true,
          import: process.env.AWS_HOSTED_ZONE_ID_PROD as string,
        },
      ),
      domain: PRODUCTION,
    };

  if ($app.stage === 'dev')
    return {
      zone: new aws.route53.Zone(
        'Zone',
        {
          name: DEV,
        },
        {
          import: AWS_HOSTED_ZONE_ID_DEV,
          ignoreChanges: ['*'],
        },
      ),
      domain: DEV,
    };

  return {
    zone: aws.route53.Zone.get('Zone', AWS_HOSTED_ZONE_ID_DEV),
    domain: `${$app.stage}.${DEV}`,
  };
})();
