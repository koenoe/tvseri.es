import type { OpenNextConfig } from '@opennextjs/aws/types/open-next.js';

const config = {
  default: {
    override: {
      incrementalCache: 's3-lite', // 'multi-tier-ddb-s3' seems broken
      queue: 'sqs-lite',
      tagCache: 'dynamodb-lite',
      wrapper: 'aws-lambda-streaming',
    },
  },
} satisfies OpenNextConfig;

export default config;
