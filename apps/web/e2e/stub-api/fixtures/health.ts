import type { StubRoute } from '../types';

/** `GET /health`: a liveness check for Playwright's `webServer`. */
export const routes: readonly StubRoute[] = [
  { handle: () => ({ body: { ok: true } }), path: '/health' },
];
