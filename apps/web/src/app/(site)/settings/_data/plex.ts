import 'server-only';

import type { WebhookStatus } from '@tvseri.es/schemas';
import { cache } from 'react';

import { apiFetch } from '@/lib/api/client';

/**
 * `GET /webhook/type/plex/status`, never the token. `null` when the
 * API didn't answer: the nav line and hero then leave Plex out instead of
 * claiming "not connected".
 */
export const loadPlexStatus = cache(
  async (accessToken: string): Promise<WebhookStatus | null> => {
    try {
      return await apiFetch<WebhookStatus>('/webhook/type/:type/status', {
        accessToken,
        params: { type: 'plex' },
      });
    } catch {
      return null;
    }
  },
);
