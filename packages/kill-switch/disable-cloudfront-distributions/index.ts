// Based on https://blog.burakcankus.com/2024/03/31/disable-aws-cloudfront-distributions-if-budget-is-exceeded.html
import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { awsHttpOptions } from '@tvseri.es/constants';
import { disableAll } from './disableAll';

// Connection timeout only: the Lambda's 5 s timeout already bounds a slow
// call, and a request timeout tight enough to leave room for a retry would
// cut CloudFront control-plane calls that are only slow
const requestHandler = awsHttpOptions(0);
const cloudFrontClient = new CloudFrontClient({ requestHandler });

/** The kill switch: invoked by the budget or usage alert (SNS) */
export async function handler() {
  try {
    await disableAll({
      getConfig: async (id) => {
        const response = await cloudFrontClient.send(
          new GetDistributionConfigCommand({ Id: id }),
        );
        if (!response.DistributionConfig || !response.ETag) {
          throw new Error(`No config for distribution ${id}`);
        }
        return { config: response.DistributionConfig, etag: response.ETag };
      },
      listDistributionIds: async () =>
        (
          (await cloudFrontClient.send(new ListDistributionsCommand({})))
            .DistributionList?.Items ?? []
        ).flatMap(({ Id }) => (Id ? [Id] : [])),
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
