import type { ConnectionStatus } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { serviceCardPlan } from './serviceCard';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';

const DARK = {
  episodeNumber: 1,
  seasonNumber: 1,
  seriesId: 70523,
  title: 'Dark',
  watchedAt: 2,
};

const SYNCED: ConnectionStatus = {
  connected: true,
  lastSyncedAt: 1_763_100_000_000,
  // The link-time newest entry: a film, never the spotlight
  latest: { episodeTitle: null, title: 'Glass Onion', watchedAt: 3 },
  profileName: 'Koen',
  recent: [DARK],
  resumeFrom: null,
  status: 'ok',
  sync: null,
  total: 12,
  unresolvedCount: 0,
  week: [DARK],
};

const NOT_CONNECTED: ConnectionStatus = {
  ...SYNCED,
  connected: false,
  lastSyncedAt: null,
  latest: null,
  profileName: null,
  recent: [],
  resumeFrom: null,
  status: null,
  total: null,
  week: [],
};

const plan = (status: ConnectionStatus, role = 'user', userAgent = CHROME) =>
  serviceCardPlan(status, role, { userAgent });

describe('serviceCardPlan', () => {
  it('spotlights the newest synced episode, not the link’s newest entry', () => {
    expect(plan(SYNCED).spotlight).toEqual(DARK);
  });

  it('reads no show for a card that isn’t live', () => {
    expect(plan({ ...SYNCED, recent: [] }).spotlight).toBeNull();
    // Linked, never synced: waiting, not live
    expect(plan({ ...SYNCED, lastSyncedAt: null }).spotlight).toBeNull();
    // Signed out: the activity isn't drawn, so its backdrop isn't read
    expect(plan({ ...SYNCED, status: 'signed-out' }).spotlight).toBeNull();
  });

  it('reads the review list only when there is something to review', () => {
    expect(plan(SYNCED).review).toBeNull();
    expect(plan({ ...SYNCED, unresolvedCount: 3 }).review).toEqual({
      count: 3,
      overflow: 0,
      readPage: true,
    });
    expect(plan({ ...NOT_CONNECTED, unresolvedCount: 3 }).review).toBeNull();
  });

  it('tells of entries the list couldn’t keep, even with none left to load', () => {
    const sync = {
      error: null,
      films: 0,
      finishedAt: 2,
      requestedAt: 1,
      skipped: 0,
      stalled: false,
      state: 'ok' as const,
      unresolved: 0,
      unresolvedOverflow: 40,
      written: 0,
    };
    expect(plan({ ...SYNCED, sync }).review).toEqual({
      count: 0,
      overflow: 40,
      readPage: false,
    });
  });

  it('offers Sync now until the first sync, and to admins after it', () => {
    expect(plan({ ...SYNCED, lastSyncedAt: null }).syncNow).toBe(true);
    expect(plan(SYNCED).syncNow).toBe(false);
    expect(plan(SYNCED, 'admin').syncNow).toBe(true);
    expect(plan(NOT_CONNECTED, 'admin').syncNow).toBe(false);
  });

  it('decides on the server whether this browser can connect', () => {
    expect(plan(NOT_CONNECTED).browser).toBe('supported');
    expect(plan(NOT_CONNECTED, 'user', SAFARI).browser).toBe('unsupported');
  });

  it('hands the client only the scalars its panel draws', () => {
    const { status } = plan(SYNCED);
    expect(Object.keys(status).sort()).toEqual([
      'connected',
      'lastSyncedAt',
      'latest',
      'profileName',
      'resumeFrom',
      'status',
      'sync',
      'total',
    ]);
    expect(status).not.toHaveProperty('recent');
    expect(status).not.toHaveProperty('week');
  });
});
