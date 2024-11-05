// eslint-disable-next-line import/no-anonymous-default-export
export default {
  dangerous: {
    enableCacheInterception: true,
  },
  default: {
    override: {
      wrapper: 'aws-lambda-streaming',
    },
  },
};
