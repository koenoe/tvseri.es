import { SCROBBLE_PROVIDERS } from '@tvseri.es/constants';
import { describe, expect, it, vi } from 'vitest';

import { TOKEN_MASK, webhookUrl, webhookUrlPrefix } from './webhookUrl';

const TOKEN = '3f9c1a7e5b2d4c8e9a0b6f12';

describe('the Plex webhook URL', () => {
  it('keeps the shape users already pasted into their media server', () => {
    expect(webhookUrl('https://www.tvseri.es', 'plex', TOKEN)).toBe(
      `https://www.tvseri.es/api/webhooks/scrobble/plex?token=${TOKEN}`,
    );
  });

  it('is the prefix plus the token, and the mask is as long as a token', () => {
    expect(webhookUrlPrefix('https://www.tvseri.es', 'plex')).toBe(
      'https://www.tvseri.es/api/webhooks/scrobble/plex?token=',
    );
    expect(TOKEN_MASK).toHaveLength(TOKEN.length);
  });

  it('names a provider the API accepts', () => {
    expect(SCROBBLE_PROVIDERS).toContain('plex');
  });

  it('is rewritten to the API by next.config.ts', async () => {
    const { default: nextConfig } = await import(
      '../../../../../../next.config'
    );
    vi.stubEnv('API_URL', 'https://api.example.com');
    const { beforeFiles } = await nextConfig.rewrites();
    const url = new URL(webhookUrl('https://www.tvseri.es', 'plex', TOKEN));
    const rewrite = beforeFiles.find(
      (r) => r.source === '/api/webhooks/scrobble/:provider',
    );
    expect(rewrite?.destination).toBe(
      'https://api.example.com/scrobble/provider/:provider',
    );
    expect(url.pathname).toBe('/api/webhooks/scrobble/plex');
  });
});
