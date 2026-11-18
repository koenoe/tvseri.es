import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readJson, writeJsonAtomic } from './fsx.ts';
import {
  claimPortBlock,
  entryPath,
  isStale,
  loadEntries,
  type ServerEntry,
} from './registry.ts';
import { fakeLiveness } from './testLiveness.ts';

const range = { first: 3110, last: 3112 };
const me = { lstart: 'Thu Nov 12 10:00:00 2026', pid: 10 };

const entryFor =
  (name: string, claim = me) =>
  (port: number): ServerEntry => ({
    branch: 'b',
    claim,
    command: 'next dev',
    mode: 'plain',
    name,
    port,
    ports: [port],
    procs: [],
    startedAt: '2026-11-12T10:00:00.000Z',
    stream: 'show',
    url: `http://localhost:${port}`,
    worktree: '/w',
    worktreeName: 'w',
  });

let shared: string;
beforeEach(() => {
  shared = mkdtempSync(join(tmpdir(), 'agents-registry-'));
});
afterEach(() => {
  rmSync(shared, { force: true, recursive: true });
});

describe('claimPortBlock', () => {
  it('hands out the first free port and never the same one twice', () => {
    const live = fakeLiveness([me]);
    const a = claimPortBlock(shared, range, new Set(), live, entryFor('a'));
    const b = claimPortBlock(shared, range, new Set(), live, entryFor('b'));
    expect([a?.port, b?.port]).toEqual([3110, 3111]);
    expect(loadEntries(shared).map(({ entry }) => entry.name)).toEqual([
      'a',
      'b',
    ]);
  });

  it('skips a block when the port or its stub ports (+1000, +1100) listen', () => {
    const live = fakeLiveness([me]);
    const entry = claimPortBlock(
      shared,
      range,
      new Set([3110, 4111]),
      live,
      entryFor('a'),
    );
    expect(entry?.port).toBe(3112);
  });

  it('skips a block whose stub port fetch refuses (4190)', () => {
    const live = fakeLiveness([me]);
    const entry = claimPortBlock(
      shared,
      { first: 3190, last: 3191 },
      new Set(),
      live,
      entryFor('a'),
    );
    expect(entry?.port).toBe(3191);
  });

  it('reuses the port of a stale entry and keeps live ones', () => {
    const ghost = { lstart: 'Thu Nov 12 09:00:00 2026', pid: 99 };
    writeJsonAtomic(entryPath(shared, 3110), {
      ...entryFor('old', ghost)(3110),
      procs: [{ ...ghost, command: 'x', log: 'l', port: 3110, role: 'web' }],
    });
    const live = fakeLiveness([me]);
    const entry = claimPortBlock(
      shared,
      range,
      new Set(),
      live,
      entryFor('new'),
    );
    expect(entry?.port).toBe(3110);
    expect(readJson<ServerEntry>(entryPath(shared, 3110))?.name).toBe('new');
  });

  it('returns undefined when the range is full', () => {
    const live = fakeLiveness([me]);
    for (const name of ['a', 'b', 'c'])
      claimPortBlock(shared, range, new Set(), live, entryFor(name));
    expect(
      claimPortBlock(shared, range, new Set(), live, entryFor('d')),
    ).toBeUndefined();
  });
});

describe('isStale', () => {
  const proc = {
    command: 'x',
    log: 'l',
    lstart: 'Thu Nov 12 11:00:00 2026',
    pid: 50,
    port: 3110,
    role: 'web' as const,
  };
  const entry = {
    ...entryFor('a', { lstart: 'gone', pid: 1 })(3110),
    procs: [proc],
  };

  it('is live while the process runs', () => {
    expect(isStale(entry, fakeLiveness([proc]))).toBe(false);
  });

  it('is live while leftovers of its group run', () => {
    expect(isStale(entry, fakeLiveness([], [50]))).toBe(false);
  });

  it('is stale when the PID was reused by another process', () => {
    expect(isStale(entry, fakeLiveness([{ lstart: 'other', pid: 50 }]))).toBe(
      true,
    );
  });
});
