import type { OpenNextConfig } from '@opennextjs/aws/types/open-next.js';

const config = {
  dangerous: {
    enableCacheInterception: true,
  },
  default: {
    override: {
      incrementalCache: 'multi-tier-ddb-s3',
      queue: 'sqs-lite',
      tagCache: 'dynamodb-lite',
      wrapper: 'aws-lambda-streaming',
    },
  },
} satisfies OpenNextConfig;

export default config;
