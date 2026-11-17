import type { TableSchema } from './fakeDynamo';

/** Key schemas of the tables, as in infra/dynamo/*.ts */
export const TABLES: Readonly<Record<string, TableSchema>> = {
  Cache: { hashKey: 'pk' },
  Follow: {
    globalIndexes: {
      gsi1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk' },
      gsi2: { hashKey: 'gsi2pk', rangeKey: 'gsi2sk' },
    },
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  Lists: {
    globalIndexes: {
      gsi1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk' },
      gsi2: { hashKey: 'gsi2pk', rangeKey: 'gsi2sk' },
      gsi3: { hashKey: 'gsi3pk', rangeKey: 'gsi3sk' },
      gsi4: { hashKey: 'gsi4pk' },
    },
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  MetricsApiAggregated: { hashKey: 'pk', rangeKey: 'sk' },
  MetricsRaw: { hashKey: 'pk', rangeKey: 'sk' },
  MetricsWebVitalsAggregated: { hashKey: 'pk', rangeKey: 'sk' },
  PreferredImages: { hashKey: 'pk' },
  Users: {
    globalIndexes: {
      active: { hashKey: 'activePk', rangeKey: 'lastActiveAt' },
      gsi1: { hashKey: 'gsi1pk' },
      gsi2: { hashKey: 'gsi2pk' },
    },
    hashKey: 'pk',
  },
  Watched: {
    globalIndexes: {
      gsi1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk' },
      gsi2: { hashKey: 'gsi2pk', rangeKey: 'gsi2sk' },
    },
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  WebhookTokens: {
    globalIndexes: { gsi1: { hashKey: 'gsi1pk' } },
    hashKey: 'pk',
  },
};
