// Based on https://blog.burakcankus.com/2024/03/31/disable-aws-cloudfront-distributions-if-budget-is-exceeded.html
import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';

import { disableAll } from './disableAll.mjs';

const cloudFrontClient = new CloudFrontClient();

/** The kill switch: invoked by the budget or usage alert (SNS) */
export async function handler() {
  try {
    await disableAll({
      getConfig: async (id) => {
        const response = await cloudFrontClient.send(
          new GetDistributionConfigCommand({ Id: id }),
        );
        return { config: response.DistributionConfig, etag: response.ETag };
      },
      listDistributionIds: async () =>
        (
          (await cloudFrontClient.send(new ListDistributionsCommand({})))
            .DistributionList?.Items ?? []
        ).map((item) => item.Id),
      updateConfig: (id, config, etag) =>
        cloudFrontClient.send(
          new UpdateDistributionCommand({
            DistributionConfig: config,
            Id: id,
            IfMatch: etag,
          }),
        ),
    });
  } catch (error) {
    console.error('[KILL SWITCH] Disabling distributions failed', error);
    throw error;
  }
}
