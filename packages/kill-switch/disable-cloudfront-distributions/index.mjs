// sourced from: https://blog.burakcankus.com/2024/03/31/disable-aws-cloudfront-distributions-if-budget-is-exceeded.html

import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';

const cloudFrontClient = new CloudFrontClient();

export async function handler(event, context) {
  console.log(`Event: ${JSON.stringify(event)}`);
  console.log(`Context: ${JSON.stringify(context)}`);
  try {
    // Get a list of all CloudFront distributions
    const distributionsResponse = await cloudFrontClient.send(
      new ListDistributionsCommand({}),
    );

    // Disable each distribution
    const disablePromises = distributionsResponse.DistributionList.Items.map(
      async (item) => {
        const distributionId = item.Id;
        await disableDistribution(distributionId);
      },
    );

    await Promise.all(disablePromises);

    return {
      body: 'All CloudFront distributions disabled successfully.',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      body: 'An error occurred while disabling CloudFront distributions.',
      statusCode: 500,
    };
  }
}

async function disableDistribution(distributionId) {
  try {
    // Get distribution configuration
    const configResponse = await cloudFrontClient.send(
      new GetDistributionConfigCommand({ Id: distributionId }),
    );
    const config = configResponse.DistributionConfig;

    // Check if distribution is already disabled
    if (!config.Enabled) {
      console.log(`Distribution ${distributionId} is already disabled.`);
      return; // Skip updating
    }

    const disabledConfig = {
      ...config,
      Enabled: false,
    };

    // Update distribution with modified configuration
    await cloudFrontClient.send(
      new UpdateDistributionCommand({
        DistributionConfig: disabledConfig,
        Id: distributionId,
        IfMatch: configResponse.ETag,
      }),
    );

    console.log(`Disabled CloudFront distribution: ${distributionId}`);
  } catch (error) {
    console.error(
      `Error disabling CloudFront distribution ${distributionId}:`,
      error,
    );
    throw error;
  }
}
