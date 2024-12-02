const config = {
  dangerous: {
    enableCacheInterception: true,
  },
  default: {
    placement: 'global',
    override: {
      converter: 'aws-apigw-v2',
      incrementalCache: 's3-lite',
      queue: 'sqs-lite',
      tagCache: 'dynamodb-lite',
      wrapper: 'aws-lambda-streaming',
    },
  },
};

export default config;
