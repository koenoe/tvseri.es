import type { ConnectionStatus, WebhookStatus } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  connectableAppsLine,
  connectedAppsSummary,
  connectedAppsText,
} from './connectedAppsLine';

const plex = (over: Partial<WebhookStatus> = {}) =>
  ({
    connected: true,
    lastReceivedAt: null,
    paused: false,
    urlWorks: true,
    ...over,
  }) as WebhookStatus;

const netflix = (over: Partial<ConnectionStatus> = {}) => ({
  netflix: {
    connected: true,
    lastSyncedAt: null,
    status: 'ok',
    ...over,
  } as ConnectionStatus,
});

const text = (...args: Parameters<typeof connectedAppsSummary>) =>
  connectedAppsText(connectedAppsSummary(...args));

describe('the Connected apps summary', () => {
  it('names the one connected app with its state', () => {
    expect(text(plex({ lastReceivedAt: 1 }), {})).toBe('Plex receiving');
    expect(text(null, netflix())).toBe('Netflix · first sync to start');
    expect(text(plex({ connected: false }), netflix({ lastSyncedAt: 1 }))).toBe(
      'Netflix connected',
    );
  });

  it('names two, in the page’s order, and counts three or more', () => {
    expect(text(plex(), netflix({ lastSyncedAt: 1 }))).toBe(
      'Netflix, Plex connected',
    );
    expect(
      text(plex(), {
        ...netflix({ lastSyncedAt: 1 }),
        prime: {
          connected: true,
          lastSyncedAt: 1,
          status: 'ok',
        } as ConnectionStatus,
      }),
    ).toBe('3 apps connected');
  });

  it('puts what needs the viewer before the count', () => {
    expect(
      text(plex(), netflix({ lastSyncedAt: 1, status: 'signed-out' })),
    ).toBe('Netflix signed out');
    expect(
      text(
        plex({ urlWorks: false }),
        netflix({ lastSyncedAt: 1, status: 'signed-out' }),
      ),
    ).toBe('Netflix signed out · +1 more');
  });

  it('invites when nothing is connected or nothing answered', () => {
    expect(connectedAppsSummary(null, {})).toEqual({ kind: 'none' });
    expect(
      text(plex({ connected: false }), netflix({ connected: false })),
    ).toBe(connectableAppsLine());
  });
});
