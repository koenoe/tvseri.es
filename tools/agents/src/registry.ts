import { join } from 'node:path';
import {
  type PortRange,
  STUB_API_OFFSET,
  STUB_AUTH_OFFSET,
} from './context.ts';
import {
  createExclusive,
  listJson,
  readJson,
  removeIfUnchanged,
} from './fsx.ts';
import type { ProcIdentity } from './proc.ts';

export type ServerRole = 'web' | 'stub-api' | 'stub-auth';

export type ServerProc = ProcIdentity &
  Readonly<{
    command: string;
    log: string;
    port: number;
    role: ServerRole;
  }>;

export type ServerMode = 'plain' | 'stub' | 'real' | 'e2e';

/** One `agents:serve` entry: a block of ports (web, +1000, +1100) and the processes we started on them. */
export type ServerEntry = Readonly<{
  branch: string;
  /** The `agents:serve` process that claimed the block (alive while it starts the servers). */
  claim: ProcIdentity;
  command: string;
  mode: ServerMode;
  name: string;
  port: number;
  ports: readonly number[];
  procs: readonly ServerProc[];
  startedAt: string;
  stream: string;
  url: string;
  worktree: string;
  worktreeName: string;
}>;

const serversDir = (shared: string): string => join(shared, 'servers');

export const entryPath = (shared: string, port: number): string =>
  join(serversDir(shared), `${port}.json`);

export const portBlock = (port: number): readonly number[] => [
  port,
  port + STUB_API_OFFSET,
  port + STUB_AUTH_OFFSET,
];

/**
 * Ports the fetch standard refuses ("bad port"; Node's fetch too), from 1024
 * up. 4190 is the stub API of the "other" range's first block (3190).
 */
const FETCH_BLOCKED_PORTS: ReadonlySet<number> = new Set([
  1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666,
  6667, 6668, 6669, 6697, 10080,
]);

export type LoadedEntry = Readonly<{ entry: ServerEntry; path: string }>;

export const loadEntries = (shared: string): readonly LoadedEntry[] =>
  listJson(serversDir(shared)).flatMap((path) => {
    const entry = readJson<ServerEntry>(path);
    return entry ? [{ entry, path }] : [];
  });

export type Liveness = Readonly<{
  /** The process with this PID and start time. */
  isSame: (identity: ProcIdentity) => boolean;
  /** Any member left in the group `pgid` (leader may be gone). */
  hasGroup: (pgid: number) => boolean;
}>;

/** An entry is stale when nothing it started is running and its claimer is gone. */
export const isStale = (entry: ServerEntry, live: Liveness): boolean =>
  !live.isSame(entry.claim) &&
  entry.procs.every((proc) => !live.isSame(proc) && !live.hasGroup(proc.pid));

/**
 * Claims the first free port block in `range`: no registry entry (stale ones
 * are removed first), none of its three ports listening and none that fetch
 * refuses. The claim is an exclusive file, so two agents never get the same
 * block.
 */
export const claimPortBlock = (
  shared: string,
  range: PortRange,
  listening: ReadonlySet<number>,
  live: Liveness,
  makeEntry: (port: number) => ServerEntry,
): ServerEntry | undefined => {
  for (let port = range.first; port <= range.last; port += 1) {
    if (
      portBlock(port).some(
        (p) => listening.has(p) || FETCH_BLOCKED_PORTS.has(p),
      )
    ) {
      continue;
    }
    const path = entryPath(shared, port);
    const existing = readJson<ServerEntry>(path);
    if (existing && !isStale(existing, live)) continue;
    if (existing && !removeIfUnchanged(path, existing)) continue;
    const entry = makeEntry(port);
    if (createExclusive(path, entry)) return entry;
  }
  return undefined;
};
