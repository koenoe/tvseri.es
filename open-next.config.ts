import type { OpenNextConfig } from '@opennextjs/aws/types/open-next.js';

const config = {
  default: {
    override: {
      incrementalCache: 's3-lite',
      queue: 'sqs-lite',
      tagCache: 'dynamodb-lite',
      wrapper: 'aws-lambda-streaming',
    },
  },
  // TODO: investigate in future how to make this work and if it's beneficial
  // functions: {
  //   edge: {
  //     runtime: 'edge',
  //     placement: 'global',
  //     routes: ['app/api/webhooks/scrobble/[provider]/route'],
  //     patterns: ['api/webhooks/*'],
  //   },
  // },
} satisfies OpenNextConfig;

export default config;
