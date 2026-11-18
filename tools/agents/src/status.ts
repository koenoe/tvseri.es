import { basename, join } from 'node:path';
import { BASE } from './base.ts';
import { type Context, streamOf } from './context.ts';
import { exec, git } from './exec.ts';
import { table, truncate } from './format.ts';
import { writeJsonAtomic } from './fsx.ts';
import { guardState, listWorktrees } from './gitGuard.ts';
import { heavyDir, readState } from './heavy.ts';
import { isStale, loadEntries } from './registry.ts';
import { liveness } from './serve.ts';

/** Parses `git rev-list --left-right --count base...HEAD` ("behind\tahead"). */
export const parseAheadBehind = (
  output: string,
): Readonly<{ ahead: number; behind: number }> => {
  const [behind, ahead] = output.trim().split(/\s+/).map(Number);
  return { ahead: ahead ?? 0, behind: behind ?? 0 };
};

export type WorktreeStatus = Readonly<{
  ahead: number;
  behind: number;
  branch: string;
  dirty: number;
  heavy: readonly string[];
  lastCommitAt: string;
  lastCommitSubject: string;
  path: string;
  servers: readonly string[];
  stashGuard: string;
  stream: string;
}>;

export const status = (ctx: Context, argv: readonly string[]) => {
  const live = liveness();
  const servers = loadEntries(ctx.shared).filter(
    ({ entry }) => !isStale(entry, live),
  );
  const heavy = readState(heavyDir(ctx.shared), live);
  const repoFolder = basename(ctx.mainCheckout);
  const rows: WorktreeStatus[] = listWorktrees(ctx).map((tree) => {
    const branch = tree.branch ?? '(detached)';
    const counts = parseAheadBehind(
      git(tree.path, [
        'rev-list',
        '--left-right',
        '--count',
        `${BASE}...HEAD`,
      ]) ?? '',
    );
    const [at = '', subject = ''] = (
      git(tree.path, ['log', '-1', '--format=%cI%x09%s']) ?? ''
    ).split('\t');
    const dirty = exec('git', ['status', '--porcelain'], { cwd: tree.path })
      .stdout.split('\n')
      .filter(Boolean).length;
    const folder = basename(tree.path);
    return {
      ...counts,
      branch,
      dirty,
      heavy: [
        ...heavy.holders.map((h) => ({ ...h, state: 'holds' })),
        ...heavy.queue.map((h) => ({ ...h, state: 'waits' })),
      ]
        .filter(({ record }) => record.worktreeName === folder)
        .map(({ record, state }) => `${state}: ${record.command}`),
      lastCommitAt: at,
      lastCommitSubject: subject,
      path: tree.path,
      servers: servers
        .filter(({ entry }) => entry.worktree === tree.path)
        .map(({ entry }) => `${entry.name}:${entry.port}`),
      stashGuard:
        tree.path === ctx.mainCheckout ? 'n/a' : guardState(tree.path),
      stream: streamOf(folder, repoFolder),
    };
  });
  const out = join(ctx.shared, 'status.json');
  writeJsonAtomic(out, {
    base: BASE,
    generatedAt: new Date().toISOString(),
    worktrees: rows,
  });
  if (argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2));
    return 0;
  }
  const ago = (iso: string) => {
    const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    return Number.isNaN(minutes)
      ? '?'
      : minutes < 120
        ? `${minutes}m`
        : `${Math.round(minutes / 60)}h`;
  };
  console.log(
    table(
      [
        'WORKTREE',
        'BRANCH',
        `+/- ${BASE}`,
        'LAST',
        'DIRTY',
        'SERVERS',
        'HEAVY',
        'GUARD',
        'SUBJECT',
      ],
      rows.map((row) => [
        basename(row.path),
        row.branch,
        `+${row.ahead}/-${row.behind}`,
        ago(row.lastCommitAt),
        String(row.dirty),
        row.servers.join(' ') || '-',
        row.heavy.length
          ? row.heavy.map((h) => h.split(':')[0]).join(',')
          : '-',
        row.stashGuard,
        truncate(row.lastCommitSubject, 50),
      ]),
    ),
  );
  console.log(`\nJSON: ${out}`);
  return 0;
};
