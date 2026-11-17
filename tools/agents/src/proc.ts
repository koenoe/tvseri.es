import { setTimeout as sleep } from 'node:timers/promises';
import { exec } from './exec.ts';

export type ProcInfo = Readonly<{
  command: string;
  /** `ps -o lstart` (C locale): start time to the second; with the PID it identifies one process. */
  lstart: string;
  pgid: number;
  pid: number;
}>;

/** A process we started: PID plus its start time, so a reused PID never matches. */
export type ProcIdentity = Readonly<{ lstart: string; pid: number }>;

/** Parses one `ps -o pid=,pgid=,lstart=,command=` line (lstart is five words). */
export const parsePsLine = (line: string): ProcInfo | undefined => {
  const match = line
    .trim()
    .match(/^(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+[\d:]+\s+\d+)\s+(.*)$/);
  if (!match) return undefined;
  const [, pid, pgid, lstart, command] = match;
  return {
    command: command ?? '',
    lstart: (lstart ?? '').replace(/\s+/g, ' '),
    pgid: Number(pgid),
    pid: Number(pid),
  };
};

const PS_FIELDS = 'pid=,pgid=,lstart=,command=';

export const procInfo = (pid: number): ProcInfo | undefined => {
  if (!Number.isInteger(pid) || pid <= 0) return undefined;
  const result = exec('ps', ['-o', PS_FIELDS, '-p', String(pid)]);
  if (result.code !== 0) return undefined;
  return parsePsLine(result.stdout.split('\n')[0] ?? '');
};

/** Every process of this user (one `ps` call). */
export const allProcs = (): readonly ProcInfo[] => {
  const result = exec('ps', ['-x', '-o', PS_FIELDS]);
  return result.stdout
    .split('\n')
    .map(parsePsLine)
    .filter((info): info is ProcInfo => info !== undefined);
};

export type Listener = Readonly<{ pid: number; port: number }>;

/** Parses `lsof -nP -iTCP -sTCP:LISTEN -Fpn` output. */
export const parseLsofListeners = (output: string): readonly Listener[] => {
  const listeners: Listener[] = [];
  const seen = new Set<string>();
  let pid = 0;
  for (const line of output.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n') && pid > 0) {
      const port = Number(line.slice(line.lastIndexOf(':') + 1));
      const key = `${pid}:${port}`;
      if (Number.isInteger(port) && port > 0 && !seen.has(key)) {
        seen.add(key);
        listeners.push({ pid, port });
      }
    }
  }
  return listeners;
};

/** TCP listeners of this user's processes. */
export const tcpListeners = (): readonly Listener[] =>
  parseLsofListeners(
    exec('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-Fpn'], {
      timeoutMs: 60_000,
    }).stdout,
  );

/** Parses `lsof -a -d cwd -p … -Fpn` into pid → cwd. */
export const parseLsofCwds = (output: string): ReadonlyMap<number, string> => {
  const cwds = new Map<number, string>();
  let pid = 0;
  for (const line of output.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n') && pid > 0) cwds.set(pid, line.slice(1));
  }
  return cwds;
};

export const processCwds = (
  pids: readonly number[],
): ReadonlyMap<number, string> => {
  if (pids.length === 0) return new Map();
  return parseLsofCwds(
    exec('lsof', ['-a', '-d', 'cwd', '-p', pids.join(','), '-Fpn'], {
      timeoutMs: 60_000,
    }).stdout,
  );
};

/** PIDs whose process group is `pgid`. */
const groupMembers = (pgid: number): readonly number[] =>
  allProcs()
    .filter((info) => info.pgid === pgid)
    .map((info) => info.pid);

export type StopOutcome =
  | 'stopped'
  | 'killed'
  | 'already-gone'
  | 'not-ours'
  | 'still-running';

/**
 * Stops the process group we started with `identity` (the leader's PID is
 * the group id). Signals only when the leader is still the recorded process,
 * or, if the leader is gone, when leftover members still carry its group id
 * (a group id is never reused while a member lives). Never signals anything
 * else.
 */
export const stopGroup = async (
  identity: ProcIdentity,
  graceMs = 10_000,
): Promise<StopOutcome> => {
  const leader = procInfo(identity.pid);
  const leaderOurs = leader !== undefined && leader.lstart === identity.lstart;
  if (leader !== undefined && !leaderOurs) return 'not-ours';
  if (!leaderOurs && groupMembers(identity.pid).length === 0)
    return 'already-gone';
  const signal = (sig: NodeJS.Signals) => {
    try {
      process.kill(-identity.pid, sig);
    } catch {
      // The group is gone.
    }
  };
  signal('SIGTERM');
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    await sleep(250);
    if (groupMembers(identity.pid).length === 0) return 'stopped';
  }
  // Re-check the leader before escalating: it must still be ours or gone.
  const again = procInfo(identity.pid);
  if (again !== undefined && again.lstart !== identity.lstart)
    return 'not-ours';
  signal('SIGKILL');
  await sleep(500);
  return groupMembers(identity.pid).length === 0 ? 'killed' : 'still-running';
};
