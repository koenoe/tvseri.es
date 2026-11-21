import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';
import { awsHttpOptions } from '@tvseri.es/constants';

// CloudFront's control plane (us-east-1) is slower than a data-plane call;
// 5 s still lets a second attempt (same CallerReference, so no second purge)
// finish inside the API's 14 s request timeout
const client = new CloudFrontClient({ requestHandler: awsHttpOptions(5_000) });

/** Starts a purge of `paths`; a refused purge is logged, never thrown. */
export async function invalidatePaths(paths: string[]): Promise<void> {
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
