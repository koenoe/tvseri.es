/// <reference path="../.sst/platform/config.d.ts" />

const PRODUCTION = 'tvseri.es';
const DEV = 'dev.tvseri.es';

export const { zone, domain } = (() => {
  const AWS_HOSTED_ZONE_ID_DEV = process.env.AWS_HOSTED_ZONE_ID_DEV as string;

  if ($app.stage === 'production')
    return {
      zone: process.env.AWS_HOSTED_ZONE_ID_PROD as string,
      domain: PRODUCTION,
    };

  if ($app.stage === 'dev')
    return {
      zone: AWS_HOSTED_ZONE_ID_DEV,
      domain: DEV,
    };

  return {
    zone: AWS_HOSTED_ZONE_ID_DEV,
    domain: `${$app.stage}.${DEV}`,
  };
})();
