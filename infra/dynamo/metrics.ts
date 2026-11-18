/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * First-party metrics: raw Web Vitals and API events (7-day TTL, no GSIs:
 * written constantly, read only by the daily aggregation), and one aggregate
 * table per kind (30-day TTL).
 *
 * Aggregates put the date plus any filter combination in `pk` and the
 * dimension in `sk`, so one query lists a dimension under a filter (routes on
 * mobile: pk `<date>#D#mobile`, sk begins_with `R#`). The GSIs give one
 * dimension's value over time.
 */
export const metricsRaw = new sst.aws.Dynamo('MetricsRaw', {
  fields: {
    pk: 'string', // WEB#<date>#<shard> | API#<date>#<shard> (shard: 0-9)
    sk: 'string', // <timestamp>#<id>
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
});

export const metricsWebVitals = new sst.aws.Dynamo(
  'MetricsWebVitalsAggregated',
  {
    fields: {
      GSI1PK: 'string', // R#<route>
      GSI1SK: 'string', // date
      GSI2PK: 'string', // C#<country>
      GSI2SK: 'string', // date
      GSI3PK: 'string', // D#<device>
      GSI3SK: 'string', // date
      pk: 'string', // <date> | <date>#D#<device> | <date>#C#<country> | <date>#D#<device>#C#<country>
      sk: 'string', // SUMMARY | R#<route> | C#<country> | D#<device>
    },
    globalIndexes: {
      CountryTimeIndex: {
        hashKey: 'GSI2PK',
        projection: 'all',
        rangeKey: 'GSI2SK',
      },
      DeviceTimeIndex: {
        hashKey: 'GSI3PK',
        projection: 'all',
        rangeKey: 'GSI3SK',
      },
      RouteTimeIndex: {
        hashKey: 'GSI1PK',
        projection: 'all',
        rangeKey: 'GSI1SK',
      },
    },
    primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
    ttl: 'expiresAt',
  },
);

export const metricsApi = new sst.aws.Dynamo('MetricsApiAggregated', {
  fields: {
    GSI1PK: 'string', // E#<endpoint>
    GSI1SK: 'string', // date
    GSI2PK: 'string', // P#<platform>
    GSI2SK: 'string', // date
    GSI3PK: 'string', // C#<country>
    GSI3SK: 'string', // date
    pk: 'string', // <date> | <date>#P#<platform> | <date>#C#<country> | <date>#P#<platform>#C#<country>
    sk: 'string', // SUMMARY | E#<endpoint> | P#<platform> | C#<country>
  },
  globalIndexes: {
    CountryTimeIndex: {
      hashKey: 'GSI3PK',
      projection: 'all',
      rangeKey: 'GSI3SK',
    },
    EndpointTimeIndex: {
      hashKey: 'GSI1PK',
      projection: 'all',
      rangeKey: 'GSI1SK',
    },
    PlatformTimeIndex: {
      hashKey: 'GSI2PK',
      projection: 'all',
      rangeKey: 'GSI2SK',
    },
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
});
