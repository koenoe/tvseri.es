import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Linked SST resources for tests (sst reads SST_RESOURCES_JSON). Table names
// are the keys of the in-memory DynamoDB double (test/tables.ts).
const resources = {
  ApiKey: { value: 'test-api-key' },
  App: { name: 'tvseries', stage: 'test' },
  Auth: { url: 'https://auth.test' },
  Cache: { name: 'Cache' },
  DeleteAccountQueue: { url: 'https://sqs.test/delete-account' },
  DominantColor: { name: 'DominantColor' },
  Follow: { name: 'Follow' },
  Lists: { name: 'Lists' },
  MdblistApiKey: { value: 'test-mdblist' },
  MetricsApiAggregated: { name: 'MetricsApiAggregated' },
  MetricsQueue: { url: 'https://sqs.test/metrics' },
  MetricsRaw: { name: 'MetricsRaw' },
  MetricsWebVitalsAggregated: { name: 'MetricsWebVitalsAggregated' },
  OmdbApiKey: { value: 'test-omdb' },
  PreferredImages: { name: 'PreferredImages' },
  ScrobbleQueue: { url: 'https://sqs.test/scrobble' },
  TmdbApiAccessToken: { value: 'test-tmdb-token' },
  TmdbApiKey: { value: 'test-tmdb-key' },
  UndoImportQueue: { url: 'https://sqs.test/undo-import' },
  Users: { name: 'Users' },
  ValidateWatchedStatusQueue: { url: 'https://sqs.test/validate' },
  Watched: { name: 'Watched' },
  WebhookTokens: { name: 'WebhookTokens' },
  WebhookTokensKvs: { arn: 'arn:aws:cloudfront::0:key-value-store/test' },
};

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    env: { SST_RESOURCES_JSON: JSON.stringify(resources) },
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
