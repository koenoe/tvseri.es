import 'server-only';

import {
  CONNECTION_SERVICES,
  type ConnectionService,
  type ConnectionStatus,
  ConnectionStatusSchema,
} from '@tvseri.es/schemas';
import { cache } from 'react';

import { apiFetch } from '@/lib/api/client';

/**
 * Never cached. `null` when the API didn't answer, so the card fails to its
 * boundary instead of claiming "Not connected".
 */
export const loadConnectionStatus = cache(
  async (
    accessToken: string,
    service: ConnectionService,
  ): Promise<ConnectionStatus | null> => {
    try {
      return await apiFetch('/me/connections/:service', {
        accessToken,
        params: { service },
        schema: ConnectionStatusSchema,
      });
    } catch {
      return null;
    }
  },
);

/** Every service's status, read in parallel */
export const loadConnectionStatuses = cache(
  async (
    accessToken: string,
  ): Promise<
    Readonly<Partial<Record<ConnectionService, ConnectionStatus | null>>>
  > =>
    Object.fromEntries(
      await Promise.all(
        CONNECTION_SERVICES.map(
          async (service) =>
            [
              service,
              await loadConnectionStatus(accessToken, service),
            ] as const,
        ),
      ),
    ),
);
