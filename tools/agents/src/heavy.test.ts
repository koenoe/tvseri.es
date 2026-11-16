import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeJsonAtomic } from './fsx.ts';
import {
  enqueue,
  type HeavyRecord,
  newId,
  pruneStale,
  readConfig,
  readState,
  tryAcquire,
} from './heavy.ts';
import { fakeLiveness } from './testLiveness.ts';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'agents-heavy-'));
});
afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

const record = (pid: number, at: number): HeavyRecord => ({
  branch: 'b',
  command: `job ${pid}`,
  heartbeatAt: new Date(at).toISOString(),
  id: newId(pid, at),
  lstart: `start ${pid}`,
  pid,
  queuedAt: new Date(at).toISOString(),
  stream: 'show',
  worktreeName: `w${pid}`,
});

const identity = (r: HeavyRecord) => ({ lstart: r.lstart, pid: r.pid });

describe('heavy semaphore', () => {
  it('admits in FIFO order and never more than the slot count', () => {
    const jobs = [1, 2, 3].map((pid) => record(pid, 1000 + pid));
    const live = fakeLiveness(jobs.map(identity));
    // Enqueue out of pid order: the ticket time decides.
    const tickets = new Map(
      [jobs[2], jobs[0], jobs[1]].map((job) => [
        job?.pid,
        enqueue(dir, job as HeavyRecord),
      ]),
    );
    const attempt = (job: HeavyRecord) =>
      tryAcquire(dir, tickets.get(job.pid) ?? '', job, 2, live);

    const [one, two, three] = jobs as [HeavyRecord, HeavyRecord, HeavyRecord];
    const third = attempt(three);
    expect(third.acquired).toBeUndefined();
    expect(third.position).toBe(2);
    expect(attempt(one).acquired).toBeDefined();
    expect(attempt(two).acquired).toBeDefined();
    expect(attempt(three).acquired).toBeUndefined();
    expect(readState(dir, live).holders).toHaveLength(2);
  });

  it('lets the next waiter in when a holder dies (stale lock recovery)', () => {
    const [one, two] = [record(1, 1), record(2, 2)];
    const both = fakeLiveness([identity(one), identity(two)]);
    const t1 = enqueue(dir, one);
    const t2 = enqueue(dir, two);
    const slot = tryAcquire(dir, t1, one, 1, both).acquired ?? '';
    expect(tryAcquire(dir, t2, two, 1, both).acquired).toBeUndefined();

    const onlyTwo = fakeLiveness([identity(two)]);
    expect(tryAcquire(dir, t2, two, 1, onlyTwo).acquired).toBe(slot);
  });

  it('keeps a lock while the job runs even if its wrapper died', () => {
    const child = { lstart: 'child', pid: 77 };
    writeJsonAtomic(join(dir, 'slots', 'slot-0.json'), {
      ...record(1, 1),
      child,
    });
    expect(pruneStale(dir, fakeLiveness([child]))).toHaveLength(0);
    expect(pruneStale(dir, fakeLiveness([]))).toHaveLength(1);
  });

  it('drops tickets of waiters that are gone', () => {
    const ghost = record(5, 5);
    const ticket = enqueue(dir, ghost);
    expect(pruneStale(dir, fakeLiveness([]))).toEqual([ghost]);
    expect(existsSync(ticket)).toBe(false);
  });

  it('reads slots from config.json, with an env override', () => {
    expect(readConfig(dir, {}).slots).toBe(2);
    expect(readConfig(dir, { AGENTS_HEAVY_SLOTS: '3' }).slots).toBe(3);
  });
});
