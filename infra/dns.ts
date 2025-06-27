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
