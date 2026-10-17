// BudgetAlertSNS is only created outside `sst dev` (see sst.config.ts), so a
// locally regenerated sst-env.d.ts drops it. Declare it here so types stay stable.
import 'sst';

declare module 'sst' {
  export interface Resource {
    BudgetAlertSNS: {
      arn: string;
      type: 'sst.aws.SnsTopic';
    };
  }
}
