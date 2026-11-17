// BudgetAlertSNS exists in production only (sst.config.ts), so an
// sst-env.d.ts generated for any other stage drops it. Declared here so the
// types don't depend on the stage they were generated for.
import 'sst';

declare module 'sst' {
  export interface Resource {
    BudgetAlertSNS: {
      arn: string;
      type: 'sst.aws.SnsTopic';
    };
  }
}
