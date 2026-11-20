import type { ConnectionStatus } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { appNeedingYou } from './appNeedingYou';

type Facts = Pick<ConnectionStatus, 'connected' | 'lastSyncedAt' | 'status'>;

const SYNCED: Facts = { connected: true, lastSyncedAt: 1, status: 'ok' };
const NOT_LINKED: Facts = {
  connected: false,
  lastSyncedAt: null,
  status: null,
};
const SIGNED_OUT: Facts = { ...SYNCED, status: 'signed-out' };
const FIRST_SYNC: Facts = { ...SYNCED, lastSyncedAt: null };

describe('appNeedingYou', () => {
  it('opens nothing when every app is fine or not linked', () => {
    expect(
      appNeedingYou({ bbc: NOT_LINKED, netflix: SYNCED, prime: SYNCED }),
    ).toBe('');
  });

  it('opens a service the service signed out', () => {
    expect(appNeedingYou({ bbc: SIGNED_OUT, netflix: SYNCED })).toBe('bbc');
  });

  it('opens a link whose first sync is still to start', () => {
    expect(appNeedingYou({ prime: FIRST_SYNC })).toBe('prime');
  });

  it('opens the first in the page’s order when several need you', () => {
    expect(
      appNeedingYou({ bbc: SIGNED_OUT, netflix: SYNCED, prime: FIRST_SYNC }),
    ).toBe('prime');
  });

  it('leaves out a status the API didn’t answer', () => {
    expect(appNeedingYou({ netflix: null })).toBe('');
  });
});
