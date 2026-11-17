/// <reference path="../../.sst/platform/config.d.ts" />
import { backedUp } from './backup';

export const preferredImages = new sst.aws.Dynamo('PreferredImages', {
  fields: {
    pk: 'string', // SERIES#<seriesId>

    // backdropImagePath: 'string',
    // backdropColor: 'string',
    // titleTreatmentImagePath: 'string',
    // updatedAt: 'number',
  },
  primaryIndex: { hashKey: 'pk' },
  transform: backedUp,
});
