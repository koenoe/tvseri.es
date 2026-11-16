import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Context } from './context.ts';
import { exec, git } from './exec.ts';
import { table } from './format.ts';
import { ensureDir, removeFile } from './fsx.ts';
import {
  overlapping,
  parseStatusPaths,
  parseWorktrees,
  type Worktree,
} from './worktrees.ts';

const HOOK = 'reference-transaction';
const source = join(import.meta.dirname, '..', 'git-guard', HOOK);

export const listWorktrees = (ctx: Context): readonly Worktree[] =>
  parseWorktrees(git(ctx.worktree, ['worktree', 'list', '--porcelain']) ?? '');

/** The hooks folder git uses in a worktree (`core.hooksPath` is `.husky/_`, relative to each worktree). */
const hooksDir = (worktree: string): string => {
  const configured = git(worktree, [
    'rev-parse',
    '--path-format=absolute',
    '--git-path',
    'hooks',
  ]);
  return configured ?? join(worktree, '.husky', '_');
};

export type GuardState = 'installed' | 'outdated' | 'missing';

export const guardState = (worktree: string): GuardState => {
  const path = join(hooksDir(worktree), HOOK);
  if (!existsSync(path)) return 'missing';
  return readFileSync(path, 'utf8') === readFileSync(source, 'utf8')
    ? 'installed'
    : 'outdated';
};

/**
 * `install` copies the guard hook into every agent worktree (the main checkout
 * only with --include-main); `uninstall` removes it; `status` lists them.
 */
export const gitGuard = (ctx: Context, argv: readonly string[]) => {
  const action = argv[0] ?? 'status';
  const includeMain = argv.includes('--include-main');
  const trees = listWorktrees(ctx).filter(
    (tree) => includeMain || tree.path !== ctx.mainCheckout,
  );
  if (action === 'install' || action === 'uninstall') {
    for (const tree of trees) {
      const dir = hooksDir(tree.path);
      const path = join(dir, HOOK);
      if (action === 'install') {
        ensureDir(dir);
        // `.husky/_` is husky's generated folder; keep it ignored if husky has not run yet.
        if (
          !existsSync(join(dir, '.gitignore')) &&
          dir.endsWith(join('.husky', '_'))
        ) {
          writeFileSync(join(dir, '.gitignore'), '*');
        }
        writeFileSync(path, readFileSync(source));
        chmodSync(path, 0o755);
      } else removeFile(path);
    }
    console.log(
      `${action === 'install' ? 'Installed in' : 'Removed from'} ${trees.length} worktrees.`,
    );
  } else if (action !== 'status') {
    throw new Error(
      'Usage: agents:git-guard [status|install|uninstall] [--include-main]',
    );
  }
  console.log(
    table(
      ['WORKTREE', 'BRANCH', 'STASH GUARD'],
      trees.map((tree) => [
        tree.path,
        tree.branch ?? '(detached)',
        guardState(tree.path),
      ]),
    ),
  );
  return 0;
};

const BASE = process.env.AGENTS_BASE ?? 'redesign';

/**
 * Brings the integration branch into the current stream branch without
 * stashing: merges when the tree is clean, or when it is dirty but neither
 * the dirty files overlap the incoming ones nor the merge would conflict.
 * Fetches nothing.
 */
export const sync = (ctx: Context, argv: readonly string[]) => {
  const base = argv[0] ?? BASE;
  const run = (args: readonly string[]) => git(ctx.worktree, args);
  if (ctx.worktree === ctx.mainCheckout)
    throw new Error(
      'Not in the main checkout: run it from your stream worktree.',
    );
  if (ctx.branch === base || ctx.branch === '(detached)')
    throw new Error(`Run it on a stream branch, not on ${ctx.branch}.`);
  const gitDir =
    run(['rev-parse', '--path-format=absolute', '--git-dir']) ?? '';
  for (const marker of [
    'MERGE_HEAD',
    'rebase-merge',
    'rebase-apply',
    'CHERRY_PICK_HEAD',
  ]) {
    if (existsSync(join(gitDir, marker)))
      throw new Error(`A ${marker} is in progress; finish it first.`);
  }
  if (!run(['rev-parse', '--verify', '--quiet', base]))
    throw new Error(`No branch ${base}.`);
  const behind = Number(run(['rev-list', '--count', `HEAD..${base}`]) ?? '0');
  if (behind === 0) {
    console.log(`Already up to date with ${base}.`);
    return 0;
  }
  const mergeBase = run(['merge-base', 'HEAD', base]) ?? '';
  const incoming = (run(['diff', '--name-only', mergeBase, base]) ?? '')
    .split('\n')
    .filter(Boolean);
  const dirty = parseStatusPaths(
    exec('git', ['status', '--porcelain', '-z', '--untracked-files=all'], {
      cwd: ctx.worktree,
    }).stdout,
  );
  const clash = overlapping(dirty, incoming);
  if (clash.length > 0) {
    console.error(
      `Refusing: these uncommitted files also change in ${base}:\n${clash.map((f) => `  ${f}`).join('\n')}\nCommit them first (a WIP commit is fine), then run agents:sync again.`,
    );
    return 1;
  }
  const preview = exec(
    'git',
    ['merge-tree', '--write-tree', '--name-only', 'HEAD', base],
    { cwd: ctx.worktree },
  );
  if (preview.code !== 0 && dirty.length > 0) {
    console.error(
      `Refusing: merging ${base} conflicts and the tree has ${dirty.length} uncommitted files. Commit them first, then sync and resolve.`,
    );
    return 1;
  }
  console.log(
    `Merging ${behind} commits from ${base} into ${ctx.branch}${dirty.length ? ` (keeping ${dirty.length} uncommitted files)` : ''}…`,
  );
  const merge = exec('git', ['merge', '--no-edit', base], {
    cwd: ctx.worktree,
    timeoutMs: 300_000,
  });
  process.stdout.write(merge.stdout);
  process.stderr.write(merge.stderr);
  if (merge.code !== 0) {
    console.error(
      '\nThe merge stopped with conflicts: resolve them, `git add` and `git commit` (never stash, never reset --hard).',
    );
    return 1;
  }
  console.log(
    'Merged. Run `pnpm install` if the lockfile changed, then `pnpm agents:checks --quick`.',
  );
  return 0;
};
