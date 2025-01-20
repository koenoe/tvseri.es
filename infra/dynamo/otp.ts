/// <reference path="../../.sst/platform/config.d.ts" />

export const otp = new sst.aws.Dynamo('OTP', {
  fields: {
    pk: 'string', // EMAIL#<email>
    sk: 'string', // CODE#<code>

    // email: 'string',
    // createdAt: 'string',
    // expiresAt: 'number',
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  ttl: 'expiresAt',
});
