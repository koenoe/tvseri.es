import type { StubRoute } from '../types';

/** The web's web-vitals beacon forward: the API queues the batch and sends 204 */
export const routes: readonly StubRoute[] = [
  {
    handle: () => ({ status: 204 }),
    method: 'POST',
    path: '/metrics/web-vitals',
  },
];
