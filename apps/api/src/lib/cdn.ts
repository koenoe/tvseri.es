import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';

const client = new CloudFrontClient();

export async function invalidatePaths(paths: string[]) {
  const command = new CreateInvalidationCommand({
    DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: {
        Items: paths,
        Quantity: paths.length,
      },
    },
  });

  try {
    const response = await client.send(command);
    console.log('[CDN]: Invalidation created:', response.Invalidation?.Id);
  } catch (error) {
    console.error('[CDN]: Error creating invalidation:', error);
  }
}
