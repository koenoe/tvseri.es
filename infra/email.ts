/// <reference path="../.sst/platform/config.d.ts" />

import { domain, zone } from './dns';

export const email = new sst.aws.Email('Email', {
  sender: domain,
  dmarc: 'v=DMARC1; p=quarantine; adkim=s; aspf=s;',
  dns: sst.aws.dns({
    zone,
  }),
});
