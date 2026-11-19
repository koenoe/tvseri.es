import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Linked SST resources for tests (sst reads SST_RESOURCES_JSON). Table names
// are the keys of the in-memory DynamoDB double (test/tables.ts).
const resources = {
  ApiKey: { value: 'test-api-key' },
  App: { name: 'tvseries', stage: 'test' },
  Auth: { url: 'https://auth.test' },
  AuthSignIns: { name: 'AuthSignIns' },
  Cache: { name: 'Cache' },
  ConnectionSyncQueue: { url: 'https://sqs.test/connection-sync' },
  Connections: { name: 'Connections' },
  ConnectionsKey: { keyId: 'test-connections-key' },
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
    // A test's first import loads the app's module graph (AWS SDK, Hono,
    // Valibot) and some walk all of src: about a second alone, past 5 s on a
    // machine shared by parallel checks. Time limits a test means are its own
    // assertions; this only catches a hang.
    testTimeout: 30_000,
  },
});
