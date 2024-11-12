const config = {
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

export default config;