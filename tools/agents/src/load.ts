import { cpus, loadavg } from 'node:os';
import { basename } from 'node:path';
import type { Context } from './context.ts';
import { exec } from './exec.ts';
import { table, truncate } from './format.ts';
import { listWorktrees } from './gitGuard.ts';
import { processCwds } from './proc.ts';

export type CpuProc = Readonly<{
  command: string;
  cpu: number;
  pid: number;
  ppid: number;
  rssKb: number;
}>;

/** Parses `ps -A -o pid=,ppid=,%cpu=,rss=,command=`. */
export const parseCpuPs = (output: string): readonly CpuProc[] =>
  output.split('\n').flatMap((line) => {
    const match = line
      .trim()
      .match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(.*)$/);
    if (!match) return [];
    const [, pid, ppid, cpu, rss, command] = match;
    return [
      {
        command: command ?? '',
        cpu: Number(cpu),
        pid: Number(pid),
        ppid: Number(ppid),
        rssKb: Number(rss),
      },
    ];
  });

/** "System-wide memory free percentage: 23%" → 23. */
export const parseMemoryFree = (output: string): number | undefined => {
  const match = output.match(/free percentage:\s*(\d+)%/);
  return match ? Number(match[1]) : undefined;
};

/** The worktree a path or command line belongs to (longest matching root). */
const worktreeOf = (
  text: string,
  roots: readonly string[],
): string | undefined =>
  [...roots]
    .sort((a, b) => b.length - a.length)
    .find(
      (root) =>
        text === root ||
        text.startsWith(`${root}/`) ||
        text.includes(`${root}/`) ||
        text.endsWith(root),
    );

export type Group = Readonly<{
  cpu: number;
  name: string;
  procs: number;
  rssMb: number;
  top: string;
}>;

/**
 * Sums CPU and memory per worktree. A process belongs to a worktree by its
 * cwd or command line, else by its nearest ancestor that does (Chrome under
 * Playwright, Next's workers).
 */
export const groupByWorktree = (
  procs: readonly CpuProc[],
  cwds: ReadonlyMap<number, string>,
  roots: readonly string[],
): readonly Group[] => {
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const ownerOf = (proc: CpuProc): string => {
    let current: CpuProc | undefined = proc;
    for (let depth = 0; current && depth < 12; depth += 1) {
      const hit =
        worktreeOf(cwds.get(current.pid) ?? '', roots) ??
        worktreeOf(current.command, roots);
      if (hit) return basename(hit);
      current = byPid.get(current.ppid);
    }
    return '(not a worktree)';
  };
  const groups = new Map<
    string,
    { cpu: number; procs: CpuProc[]; rssKb: number }
  >();
  for (const proc of procs) {
    const name = ownerOf(proc);
    const group = groups.get(name) ?? { cpu: 0, procs: [], rssKb: 0 };
    group.cpu += proc.cpu;
    group.rssKb += proc.rssKb;
    group.procs.push(proc);
    groups.set(name, group);
  }
  return [...groups.entries()]
    .map(([name, group]) => ({
      cpu: Math.round(group.cpu),
      name,
      procs: group.procs.length,
      rssMb: Math.round(group.rssKb / 1024),
      top: [...group.procs].sort((a, b) => b.cpu - a.cpu)[0]?.command ?? '',
    }))
    .sort((a, b) => b.cpu - a.cpu);
};

const numberFlag = (
  argv: readonly string[],
  flag: string,
): number | undefined => {
  const index = argv.indexOf(flag);
  const value = index === -1 ? undefined : Number(argv[index + 1]);
  return value !== undefined && Number.isFinite(value) ? value : undefined;
};

/** Exit code when the machine is over the threshold: back off before heavy work. */
const EXIT_BUSY = 3;

/**
 * Load, memory and the busiest worktrees. Exits 3 when the 1-minute load is
 * above --max-load (default 1.5 × cores) or free memory below --min-free %
 * (default 10).
 */
export const load = (ctx: Context, argv: readonly string[]) => {
  const cores = cpus().length;
  const [one = 0, five = 0, fifteen = 0] = loadavg();
  const maxLoad = numberFlag(argv, '--max-load') ?? cores * 1.5;
  const minFree = numberFlag(argv, '--min-free') ?? 10;
  const memFree = parseMemoryFree(exec('memory_pressure', ['-Q']).stdout);
  const swap =
    exec('sysctl', ['-n', 'vm.swapusage']).stdout.match(/used = (\S+)/)?.[1] ??
    '?';
  const procs = parseCpuPs(
    exec('ps', ['-A', '-o', 'pid=,ppid=,%cpu=,rss=,command=']).stdout,
  );
  const busy = [...procs].sort((a, b) => b.cpu - a.cpu).slice(0, 60);
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const lookup = new Set<number>();
  for (const proc of busy) {
    let current: CpuProc | undefined = proc;
    for (let depth = 0; current && depth < 12; depth += 1) {
      lookup.add(current.pid);
      current = byPid.get(current.ppid);
    }
  }
  const roots = listWorktrees(ctx).map((tree) => tree.path);
  const groups = groupByWorktree(
    busy,
    processCwds([...lookup].filter((pid) => pid > 1)),
    roots,
  );

  const overLoad = one > maxLoad;
  const lowMemory = memFree !== undefined && memFree < minFree;
  console.log(
    `load ${one.toFixed(1)} ${five.toFixed(1)} ${fifteen.toFixed(1)} on ${cores} cores (limit ${maxLoad})${overLoad ? '  HIGH' : ''}`,
  );
  console.log(
    `memory free ${memFree ?? '?'}% (limit ${minFree}%)${lowMemory ? '  LOW' : ''}, swap used ${swap}`,
  );
  console.log(`\nTop ${busy.length} processes by CPU, per worktree:`);
  console.log(
    table(
      ['WORKTREE', 'CPU%', 'RSS MB', 'PROCS', 'BUSIEST'],
      groups
        .slice(0, 15)
        .map((g) => [
          g.name,
          String(g.cpu),
          String(g.rssMb),
          String(g.procs),
          truncate(
            g.top.replace(/^\S*\/(node|Google Chrome[^/]*)\s/, '$1 '),
            70,
          ),
        ]),
    ),
  );
  if (overLoad || lowMemory) {
    console.log(
      '\nBusy: wait before starting heavy work (agents:heavy queues it for you), stop servers you no longer need.',
    );
    return EXIT_BUSY;
  }
  return 0;
};
