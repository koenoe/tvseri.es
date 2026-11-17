/// <reference path="../../.sst/platform/config.d.ts" />

// Point-in-time recovery on the tables that hold users' data, production
// only: any second of the last 35 days can be restored. There are no other
// backups, and account deletion and imports write in bulk.
export const backedUp = {
  table: {
    pointInTimeRecovery: { enabled: $app.stage === 'production' },
  },
};
