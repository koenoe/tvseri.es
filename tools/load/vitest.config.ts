import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The API's own source, run in-process (see src/run.load.ts)
const api = (path: string) =>
  fileURLToPath(new URL(`../../apps/api/${path}`, import.meta.url));

// The same linked SST resources the API tests use (apps/api/vitest.config.ts)
const resources = {
  ApiKey: { value: 'test-api-key' },
  App: { name: 'tvseries', stage: 'load' },
  Auth: { url: 'https://auth.test' },
  Cache: { name: 'Cache' },
  DeleteAccountQueue: { url: 'https://sqs.test/delete-account' },
  DominantColor: { name: 'DominantColor' },
  Follow: { name: 'Follow' },
  Lists: { name: 'Lists' },
  MdblistApiKey: { value: 'test-mdblist' },
  MetricsQueue: { url: 'https://sqs.test/metrics' },
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
  resolve: { alias: { '@': api('src') } },
  test: {
    env: {
      // Any AWS SDK call the rig forgot to mock goes to a dead local port,
      // never to AWS
      AWS_ACCESS_KEY_ID: 'load-rig',
      AWS_ENDPOINT_URL: 'http://127.0.0.1:9',
      AWS_REGION: 'eu-west-2',
      AWS_SECRET_ACCESS_KEY: 'load-rig',
      SST_RESOURCES_JSON: JSON.stringify(resources),
    },
    include: ['src/**/*.load.ts'],
    setupFiles: ['./src/setup.ts'],
    testTimeout: 600_000,
  },
});
