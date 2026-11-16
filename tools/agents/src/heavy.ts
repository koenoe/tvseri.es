import { spawn } from 'node:child_process';
import { constants, setPriority } from 'node:os';
import { join } from 'node:path';
import type { Context } from './context.ts';
import { since, table, truncate } from './format.ts';
import {
  createExclusive,
  ensureDir,
  listJson,
  readJson,
  removeFile,
  removeIfUnchanged,
  writeJsonAtomic,
} from './fsx.ts';
import { type ProcIdentity, procInfo } from './proc.ts';
import type { Liveness } from './registry.ts';
import { liveness, toArgv } from './serve.ts';

/** A waiter's ticket or a holder's slot lock. */
export type HeavyRecord = Readonly<{
  acquiredAt?: string;
  branch: string;
  /** The heavy command itself, once started (the lock stays valid while it runs, even if the wrapper dies). */
  child?: ProcIdentity;
  command: string;
  heartbeatAt: string;
  id: string;
  lstart: string;
  pid: number;
  queuedAt: string;
  stream: string;
  worktreeName: string;
}>;

export type HeavyConfig = Readonly<{ maxWaitMinutes: number; slots: number }>;

const DEFAULT_CONFIG: HeavyConfig = { maxWaitMinutes: 60, slots: 2 };

export const heavyDir = (shared: string): string => join(shared, 'heavy');
const queueDir = (dir: string) => join(dir, 'queue');
const slotsDir = (dir: string) => join(dir, 'slots');

/** `<shared>/heavy/config.json` (created with defaults); `AGENTS_HEAVY_SLOTS` overrides the slot count. */
export const readConfig = (
  dir: string,
  env: NodeJS.ProcessEnv = process.env,
): HeavyConfig => {
  const path = join(dir, 'config.json');
  const stored = readJson<Partial<HeavyConfig>>(path);
  if (!stored) writeJsonAtomic(path, DEFAULT_CONFIG);
  const slots = Number(env.AGENTS_HEAVY_SLOTS ?? stored?.slots);
  const maxWait = Number(stored?.maxWaitMinutes);
  return {
    maxWaitMinutes: maxWait > 0 ? maxWait : DEFAULT_CONFIG.maxWaitMinutes,
    slots: Number.isInteger(slots) && slots > 0 ? slots : DEFAULT_CONFIG.slots,
  };
};

const isRecordLive = (record: HeavyRecord, live: Liveness): boolean =>
  live.isSame(record) ||
  (record.child !== undefined && live.isSame(record.child));

type Loaded = Readonly<{ path: string; record: HeavyRecord }>;

const load = (dir: string): readonly Loaded[] =>
  listJson(dir).flatMap((path) => {
    const record = readJson<HeavyRecord>(path);
    return record ? [{ path, record }] : [];
  });

/** Removes tickets and locks whose processes are gone; returns what it removed. */
export const pruneStale = (
  dir: string,
  live: Liveness,
): readonly HeavyRecord[] =>
  [...load(queueDir(dir)), ...load(slotsDir(dir))].flatMap(
    ({ path, record }) =>
      !isRecordLive(record, live) && removeIfUnchanged(path, record)
        ? [record]
        : [],
  );

export type HeavyState = Readonly<{
  holders: readonly Loaded[];
  queue: readonly Loaded[];
}>;

export const readState = (dir: string, live: Liveness): HeavyState => ({
  holders: load(slotsDir(dir)).filter(({ record }) =>
    isRecordLive(record, live),
  ),
  queue: load(queueDir(dir)).filter(({ record }) => isRecordLive(record, live)),
});

/** Ticket names sort by enqueue time, which makes the queue FIFO. */
export const enqueue = (dir: string, record: HeavyRecord): string => {
  const path = join(queueDir(dir), `${record.id}.json`);
  if (!createExclusive(path, record)) throw new Error('Ticket clash');
  return path;
};

export const newId = (pid: number, now = Date.now()): string =>
  `${String(now).padStart(15, '0')}-${String(pid).padStart(7, '0')}-${Math.random().toString(36).slice(2, 8)}`;

export type AttemptResult = Readonly<{
  /** Path of the slot lock when acquired. */
  acquired?: string;
  /** 0-based place among live waiters. */
  position: number;
  state: HeavyState;
}>;

/**
 * One admission attempt: the first `free` waiters may claim a slot; a slot
 * is an exclusive file, so the slot count is never exceeded.
 */
export const tryAcquire = (
  dir: string,
  ticket: string,
  record: HeavyRecord,
  slots: number,
  live: Liveness,
  now = new Date(),
): AttemptResult => {
  pruneStale(dir, live);
  const state = readState(dir, live);
  const position = state.queue.findIndex(({ path }) => path === ticket);
  const free = slots - state.holders.length;
  if (position < 0 || position >= free) return { position, state };
  for (let index = 0; index < slots; index += 1) {
    const slot = join(slotsDir(dir), `slot-${index}.json`);
    const lock: HeavyRecord = {
      ...record,
      acquiredAt: now.toISOString(),
      heartbeatAt: now.toISOString(),
    };
    if (createExclusive(slot, lock)) {
      removeFile(ticket);
      return { acquired: slot, position, state };
    }
  }
  return { position, state };
};

const describeHolder = ({ record }: Loaded): string =>
  `[${record.worktreeName}] ${truncate(record.command, 60)} (${since(record.acquiredAt ?? record.queuedAt)}, pid ${record.pid})`;

export const printHeavyState = (dir: string): void => {
  const { slots } = readConfig(dir);
  const live = liveness();
  pruneStale(dir, live);
  const state = readState(dir, live);
  console.log(
    `Heavy slots: ${state.holders.length}/${slots} busy, ${state.queue.length} waiting`,
  );
  const rows = [
    ...state.holders.map(({ record }) => [
      'holds',
      record.worktreeName,
      String(record.pid),
      since(record.acquiredAt ?? record.queuedAt),
      truncate(record.command, 70),
    ]),
    ...state.queue.map(({ record }, index) => [
      `queue #${index + 1}`,
      record.worktreeName,
      String(record.pid),
      since(record.queuedAt),
      truncate(record.command, 70),
    ]),
  ];
  if (rows.length)
    console.log(table(['STATE', 'WORKTREE', 'PID', 'FOR', 'COMMAND'], rows));
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const say = (text: string) => process.stderr.write(`[heavy] ${text}\n`);

export type HeavyOptions = Readonly<{
  command: readonly string[];
  cwd: string;
  label?: string;
  maxWaitMinutes?: number;
  nice: boolean;
}>;

const parseHeavyArgs = (
  argv: readonly string[],
  cwd: string,
): HeavyOptions | 'status' => {
  if (argv.includes('--status') && !argv.includes('--')) return 'status';
  const dash = argv.indexOf('--');
  const flags = dash === -1 ? [] : argv.slice(0, dash);
  const command = dash === -1 ? argv : argv.slice(dash + 1);
  let maxWaitMinutes: number | undefined;
  let nice = true;
  for (let i = 0; i < flags.length; i += 1) {
    const flag = flags[i];
    if (flag === '--max-wait') {
      i += 1;
      maxWaitMinutes = Number(flags[i]);
    } else if (flag === '--no-nice') nice = false;
    else throw new Error(`Unknown flag ${flag}`);
  }
  if (command.length === 0)
    throw new Error('Usage: agents:heavy [--max-wait <min>] -- <command>');
  return { command, cwd, maxWaitMinutes, nice };
};

/** Exit code when the wait exceeds --max-wait (EX_TEMPFAIL): back off and retry later. */
const EXIT_WAIT_TIMEOUT = 75;

/**
 * Waits for a heavy slot, runs `run` while holding it, and always releases
 * it. Nested calls (a heavy command that runs `agents:heavy` again) reuse the
 * held slot instead of deadlocking.
 */
export const withHeavySlot = async (
  ctx: Context,
  options: Readonly<{ label: string; maxWaitMinutes?: number }>,
  run: (
    slotEnv: NodeJS.ProcessEnv,
    onChild: (child: ProcIdentity) => void,
  ) => Promise<number>,
): Promise<number> => {
  const dir = ensureDir(heavyDir(ctx.shared));
  const inherited = process.env.AGENTS_HEAVY_SLOT;
  if (inherited) {
    const holder = readJson<HeavyRecord>(inherited);
    if (holder && isRecordLive(holder, liveness())) {
      return run({}, () => {});
    }
  }
  const config = readConfig(dir);
  const maxWaitMs = (options.maxWaitMinutes ?? config.maxWaitMinutes) * 60_000;
  const now = new Date();
  const record: HeavyRecord = {
    branch: ctx.branch,
    command: options.label,
    heartbeatAt: now.toISOString(),
    id: newId(process.pid, now.getTime()),
    lstart: procInfo(process.pid)?.lstart ?? '',
    pid: process.pid,
    queuedAt: now.toISOString(),
    stream: ctx.stream,
    worktreeName: ctx.worktreeName,
  };
  let ticket: string | undefined = enqueue(dir, record);
  let slot: string | undefined;
  let lock: HeavyRecord = record;
  const cleanup = () => {
    if (ticket) removeFile(ticket);
    if (slot && readJson<HeavyRecord>(slot)?.id === record.id) removeFile(slot);
    ticket = undefined;
    slot = undefined;
  };
  process.on('exit', cleanup);
  let child: ProcIdentity | undefined;
  const onSignal = (signal: NodeJS.Signals) => {
    if (child) {
      try {
        process.kill(child.pid, signal);
      } catch {
        // Already gone.
      }
      return;
    }
    cleanup();
    process.exit(128 + (constants.signals[signal] ?? 1));
  };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const)
    process.on(signal, onSignal);

  const started = Date.now();
  let lastLine = '';
  let lastPrint = 0;
  for (;;) {
    const { slots } = readConfig(dir);
    const attempt = tryAcquire(dir, ticket, record, slots, liveness());
    if (attempt.acquired) {
      slot = attempt.acquired;
      ticket = undefined;
      break;
    }
    const waited = Date.now() - started;
    if (waited > maxWaitMs) {
      say(
        `gave up after ${Math.round(waited / 60_000)} min (--max-wait). Try again later.`,
      );
      cleanup();
      return EXIT_WAIT_TIMEOUT;
    }
    const line = `waiting: #${attempt.position + 1} in queue, ${attempt.state.holders.length}/${slots} slots busy`;
    if (line !== lastLine || Date.now() - lastPrint > 30_000) {
      say(line);
      for (const holder of attempt.state.holders)
        say(`  holds: ${describeHolder(holder)}`);
      lastLine = line;
      lastPrint = Date.now();
    }
    writeJsonAtomic(ticket, {
      ...record,
      heartbeatAt: new Date().toISOString(),
    });
    await sleep(2000);
  }
  const acquired = slot;
  lock = readJson<HeavyRecord>(acquired) ?? record;
  if (Date.now() - started > 3000)
    say(`got a slot after ${since(record.queuedAt)}`);
  const heartbeat = setInterval(() => {
    if (readJson<HeavyRecord>(acquired)?.id !== record.id) return;
    lock = { ...lock, heartbeatAt: new Date().toISOString() };
    writeJsonAtomic(acquired, lock);
  }, 15_000);
  try {
    return await run({ AGENTS_HEAVY_SLOT: acquired }, (identity) => {
      child = identity;
      lock = { ...lock, child: identity };
      writeJsonAtomic(acquired, lock);
    });
  } finally {
    clearInterval(heartbeat);
    child = undefined;
    cleanup();
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const)
      process.off(signal, onSignal);
    process.off('exit', cleanup);
  }
};

/** Runs one command to completion with inherited stdio; resolves its exit code. */
export const runCommand = (
  argv: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  nice: boolean,
  onChild: (child: ProcIdentity) => void,
): Promise<number> =>
  new Promise((resolve) => {
    const [command, ...args] = toArgv(argv);
    if (!command) {
      resolve(1);
      return;
    }
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    if (child.pid !== undefined) {
      if (nice) {
        try {
          // Children inherit the priority: the whole job yields to interactive work.
          setPriority(child.pid, 10);
        } catch {
          // Not fatal.
        }
      }
      onChild({ lstart: procInfo(child.pid)?.lstart ?? '', pid: child.pid });
    }
    child.on('error', (error) => {
      say(`could not start ${command}: ${error.message}`);
      resolve(127);
    });
    child.on('exit', (code, signal) => {
      resolve(code ?? 128 + (signal ? (constants.signals[signal] ?? 1) : 1));
    });
  });

export const heavy = async (ctx: Context, argv: readonly string[]) => {
  const options = parseHeavyArgs(argv, ctx.cwd);
  if (options === 'status') {
    printHeavyState(ensureDir(heavyDir(ctx.shared)));
    return 0;
  }
  const label = toArgv(options.command).join(' ');
  return withHeavySlot(
    ctx,
    { label, maxWaitMinutes: options.maxWaitMinutes },
    (env, onChild) =>
      runCommand(options.command, options.cwd, env, options.nice, onChild),
  );
};
