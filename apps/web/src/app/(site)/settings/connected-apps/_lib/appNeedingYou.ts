import {
  CONNECTION_SERVICES,
  type ConnectionService,
  type ConnectionStatus,
} from '@tvseri.es/schemas';

import type { AppBrand } from '../../_lib/services';
import { serviceStateFrom } from './serviceState';

type Facts = Pick<ConnectionStatus, 'connected' | 'lastSyncedAt' | 'status'>;

/**
 * The card that opens on its own: the first service (in the page's order)
 * the service signed out or whose first sync is still to start. Otherwise
 * none: every card starts closed, so the placeholders (headers only) match
 * and the page never moves as it streams in.
 */
export function appNeedingYou(
  statuses: Readonly<Partial<Record<ConnectionService, Facts | null>>>,
): AppBrand | '' {
  const needs = CONNECTION_SERVICES.find((service) => {
    const status = statuses[service] ?? null;
    // A linked state never asks the extension: any answer will do
    const state = serviceStateFrom(status, false, 'present');
    return status?.connected && (state === 'signed-out' || state === 'wait');
  });
  return needs ?? '';
}
