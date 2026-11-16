import type { SpotlightLines } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import { viewerRoute } from '../../handlers';

/**
 * Home's signed-in spotlight lines ("Like Severance, which you favourited")
 * for the API's own trending list: one client call per tab after hydration,
 * like the library ids, so the cached spotlight never varies per viewer.
 * The proxy answers 401 signed out.
 */
export const GET = viewerRoute(async (viewer) =>
  Response.json(
    await apiFetch<SpotlightLines>('/me/home/spotlight-lines', {
      accessToken: viewer.accessToken,
    }),
  ),
);
