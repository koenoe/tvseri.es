// eslint-disable-next-line import/no-anonymous-default-export
export default {
  dangerous: {
    enableCacheInterception: true,
  },
  default: {
    override: {
      incrementalCache: 's3-lite',
      queue: 'sqs-lite',
      tagCache: 'dynamodb-lite',
      wrapper: 'aws-lambda-streaming',
    },
  },
};
