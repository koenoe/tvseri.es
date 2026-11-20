import type { ConnectionStatus } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';
import { BBC_IPLAYER } from '../../_lib/services/bbc';
import { NETFLIX } from '../../_lib/services/netflix';
import { isSyncing, pollDelay, syncLine, syncResultLine } from './serviceSync';

type Sync = NonNullable<ConnectionStatus['sync']>;

const DONE: Sync = {
  error: null,
  films: 0,
  finishedAt: 1_763_100_000_000,
  requestedAt: 1_763_099_000_000,
  skipped: 0,
  stalled: false,
  state: 'ok',
  unresolved: 0,
  unresolvedOverflow: 0,
  written: 0,
};

describe('isSyncing', () => {
  it('is true while a sync waits or runs', () => {
    expect(isSyncing({ ...DONE, state: 'queued' })).toBe(true);
    expect(isSyncing({ ...DONE, state: 'running' })).toBe(true);
  });

  it('is false once it ends, or before any sync', () => {
    expect(isSyncing(DONE)).toBe(false);
    expect(isSyncing({ ...DONE, state: 'failed' })).toBe(false);
    expect(isSyncing(null)).toBe(false);
  });

  it('is false once the API says the run stalled', () => {
    expect(isSyncing({ ...DONE, stalled: true, state: 'queued' })).toBe(false);
    expect(isSyncing({ ...DONE, stalled: true, state: 'running' })).toBe(false);
  });
});

describe('pollDelay', () => {
  it('asks every 5 seconds for the sync’s first minute, then every 30', () => {
    expect(pollDelay(0)).toBe(5000);
    expect(pollDelay(59_999)).toBe(5000);
    expect(pollDelay(60_000)).toBe(30_000);
    expect(pollDelay(45 * 60_000)).toBe(30_000);
  });
});

describe('syncResultLine', () => {
  it('leaves the sign-out to the reconnect block when it is on screen', () => {
    const signedOut: Sync = { ...DONE, error: 'signed-out', state: 'failed' };
    expect(syncResultLine(NETFLIX, signedOut, true)).toBe('');
    expect(syncResultLine(NETFLIX, signedOut)).toBe(
      'Netflix signed this connection out. Connect again through the extension.',
    );
    // Any other failure is still said
    expect(
      syncResultLine(NETFLIX, { ...signedOut, error: 'changed' }, true),
    ).toMatch(/^Netflix changed its history page/);
  });

  it('says nothing has run before the first sync', () => {
    expect(syncResultLine(NETFLIX, null)).toBe('No sync has run yet.');
  });

  it('says a sync is on its way while it waits or runs', () => {
    expect(syncResultLine(NETFLIX, { ...DONE, state: 'queued' })).toBe(
      'Sync queued. It starts in a moment.',
    );
    expect(syncResultLine(NETFLIX, { ...DONE, state: 'running' })).toBe(
      'Syncing your Netflix history now…',
    );
  });

  it('says a stalled sync stopped, and that the next one carries on', () => {
    const line =
      'The last sync stopped before it finished. The next one picks up where it stopped.';
    expect(
      syncResultLine(NETFLIX, { ...DONE, stalled: true, state: 'queued' }),
    ).toBe(line);
    expect(
      syncResultLine(NETFLIX, { ...DONE, stalled: true, state: 'running' }),
    ).toBe(line);
  });

  it('counts what a sync did, leaving out what didn’t happen', () => {
    expect(
      syncResultLine(NETFLIX, {
        ...DONE,
        films: 4,
        skipped: 1203,
        unresolved: 2,
        written: 37,
      }),
    ).toBe(
      '37 new episodes · 1,203 already watched · 4 films skipped · 2 to review',
    );
    expect(syncResultLine(NETFLIX, { ...DONE, written: 1 })).toBe(
      '1 new episode',
    );
    expect(syncResultLine(NETFLIX, DONE)).toBe('No new episodes');
  });

  it('counts the entries past the review list’s cap as to review too', () => {
    expect(
      syncResultLine(NETFLIX, {
        ...DONE,
        unresolved: 500,
        unresolvedOverflow: 12,
      }),
    ).toBe('No new episodes · 512 to review');
  });

  it('gives a plain reason when a sync failed', () => {
    const failed = (error: Sync['error']) =>
      syncResultLine(NETFLIX, { ...DONE, error, state: 'failed' });
    expect(failed('signed-out')).toBe(
      'Netflix signed this connection out. Connect again through the extension.',
    );
    expect(failed('changed')).toBe(
      'Netflix changed its history page, so the sync stopped. Nothing to do on your side: it picks up once that’s fixed.',
    );
    expect(failed('rate-limited')).toBe(
      'Netflix is busy or limiting reads for now, so the sync paused. The next one picks up where it stopped.',
    );
    expect(failed('failed')).toBe('The last sync didn’t finish.');
    expect(failed(null)).toBe('The last sync didn’t finish.');
  });

  it('never blames a profile switch on a service whose sync has no profile', () => {
    expect(
      syncResultLine(BBC_IPLAYER, {
        ...DONE,
        error: 'profile-changed',
        state: 'failed',
      }),
    ).toBe('The last sync didn’t finish.');
  });
});

describe('syncResultLine’s to review', () => {
  it('counts the review list as it stands, not as the run left it', () => {
    const sync = { ...DONE, unresolved: 3, written: 2 };
    expect(syncResultLine(NETFLIX, sync, false, 1)).toBe(
      '2 new episodes · 1 to review',
    );
    expect(syncResultLine(NETFLIX, sync, false, 0)).toBe('2 new episodes');
  });
});

describe('syncLine', () => {
  it('splits a finished sync into counts the card can roll', () => {
    expect(syncLine(NETFLIX, { ...DONE, skipped: 1203, written: 37 })).toEqual({
      counts: [
        { count: 37, key: 'written', words: 'new episodes' },
        { count: 1203, key: 'skipped', words: 'already watched' },
      ],
      lead: null,
    });
  });

  it('says No new episodes without a number', () => {
    expect(syncLine(NETFLIX, DONE).counts).toEqual([
      { count: null, key: 'written', words: 'No new episodes' },
    ]);
  });

  it('shows a running sync’s counts so far after its line', () => {
    expect(
      syncLine(NETFLIX, { ...DONE, skipped: 4, state: 'running', written: 1 }),
    ).toEqual({
      counts: [
        { count: 1, key: 'written', words: 'new episode' },
        { count: 4, key: 'skipped', words: 'already watched' },
      ],
      lead: NETFLIX.copy.syncRunning,
    });
  });

  it('shows a running sync’s line alone until it has counted anything', () => {
    expect(syncLine(NETFLIX, { ...DONE, state: 'running' })).toEqual({
      counts: [],
      lead: NETFLIX.copy.syncRunning,
    });
  });
});
