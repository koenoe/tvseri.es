import type { ConnectionStatus } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';
import { NETFLIX } from '../../_lib/services/netflix';
import { isLive } from './appState';
import {
  serviceLook,
  serviceStateFrom,
  serviceStatusText,
} from './serviceState';

const LINKED: ConnectionStatus = {
  connected: true,
  lastSyncedAt: null,
  latest: null,
  profileName: 'Koen',
  recent: [],
  resumeFrom: null,
  status: 'ok',
  sync: null,
  total: 2542,
  unresolvedCount: 0,
  week: [],
};

const SIGNED_OUT: ConnectionStatus = {
  ...LINKED,
  lastSyncedAt: 1,
  status: 'signed-out',
};

describe('serviceStateFrom', () => {
  it('is not connected without a link, pairing while a code waits', () => {
    expect(serviceStateFrom(null, false, 'present')).toBe('none');
    expect(serviceStateFrom(null, false, 'missing')).toBe('none');
    expect(serviceStateFrom(null, true, 'present')).toBe('pairing');
  });

  it('checks the browser before it says anything about connecting', () => {
    const state = serviceStateFrom(null, false, 'checking');
    expect(state).toBe('checking');
    expect(serviceLook(state)).toBe('none');
  });

  it('is unavailable where the extension can’t run, only when not linked', () => {
    const state = serviceStateFrom(null, false, 'unsupported');
    expect(state).toBe('unavailable');
    expect(serviceLook(state)).toBe('unavailable');
    expect(serviceStateFrom(LINKED, false, 'unsupported')).toBe('wait');
  });

  it('waits after the link, like Plex before its first scrobble', () => {
    const state = serviceStateFrom(LINKED, false, 'checking');
    expect(state).toBe('wait');
    expect(isLive(serviceLook(state))).toBe(false);
  });

  it('turns live with the first sync', () => {
    const state = serviceStateFrom(
      { ...LINKED, lastSyncedAt: 1 },
      false,
      'checking',
    );
    expect(state).toBe('on');
    expect(isLive(serviceLook(state))).toBe(true);
  });

  it('asks to reconnect once Netflix signs the session out, like Plex’s broken URL', () => {
    const state = serviceStateFrom(SIGNED_OUT, false, 'present');
    expect(state).toBe('signed-out');
    expect(serviceLook(state)).toBe('broken');
    expect(serviceStateFrom(SIGNED_OUT, true, 'present')).toBe('pairing');
  });
});

describe('serviceStatusText', () => {
  it('names the profile once linked', () => {
    expect(serviceStatusText(NETFLIX, 'wait', 'Koen')).toBe(
      'Waiting for the first sync · Koen',
    );
    expect(serviceStatusText(NETFLIX, 'on', null)).toBe('Syncing · last sync ');
  });

  it('says why it can’t connect, or that it must reconnect', () => {
    expect(serviceStatusText(NETFLIX, 'unavailable', null)).toBe(
      'Not available in this browser',
    );
    expect(serviceStatusText(NETFLIX, 'signed-out', 'Koen')).toBe(
      'Netflix signed you out · reconnect',
    );
  });
});
