import { basename, dirname, join, resolve } from 'node:path';
import { git } from './exec.ts';
import { ensureDir } from './fsx.ts';

export type PortRange = Readonly<{ first: number; last: number }>;

/** Each stream's ports for web servers. +1000 and +1100 are the stub API and stub auth (the e2e rig's convention). */
const STREAM_RANGES: Readonly<Record<string, PortRange>> = {
  discover: { first: 3140, last: 3149 },
  global: { first: 3120, last: 3129 },
  home: { first: 3130, last: 3139 },
  person: { first: 3170, last: 3179 },
  profile: { first: 3150, last: 3159 },
  settings: { first: 3180, last: 3189 },
  show: { first: 3110, last: 3119 },
  stats: { first: 3160, last: 3169 },
};

const OTHER_RANGE: PortRange = { first: 3190, last: 3199 };
export const STUB_API_OFFSET = 1000;
export const STUB_AUTH_OFFSET = 1100;

/** Every port the tools hand out, for spotting listeners nobody registered. */
export const ALL_AGENT_PORTS: readonly PortRange[] = [3110, 4110, 4210].map(
  (first) => ({ first, last: first + 89 }),
);

/**
 * The stream a worktree belongs to, from its folder name: `<repo>-show-hero`
 * → `show`. The main checkout is `main`; anything unknown is `other`.
 */
export const streamOf = (folder: string, repoFolder: string): string => {
  if (folder === repoFolder) return 'main';
  const prefix = `${repoFolder}-`;
  if (!folder.startsWith(prefix)) return 'other';
  const first = folder.slice(prefix.length).split('-')[0] ?? '';
  return first in STREAM_RANGES ? first : 'other';
};

export const rangeOf = (stream: string): PortRange =>
  STREAM_RANGES[stream] ?? OTHER_RANGE;

/**
 * Shared state lives next to the checkouts, outside every worktree:
 * `<parent of the main checkout>/.tvseries-agents`, or `TVSERIES_AGENTS_DIR`.
 */
export const sharedDirFor = (
  mainCheckout: string,
  env: NodeJS.ProcessEnv = process.env,
): string =>
  env.TVSERIES_AGENTS_DIR
    ? resolve(env.TVSERIES_AGENTS_DIR)
    : join(dirname(mainCheckout), '.tvseries-agents');

export type Context = Readonly<{
  branch: string;
  /** Where the command was invoked (pnpm keeps it in INIT_CWD). */
  cwd: string;
  /** The main checkout (owner of the shared `.git`). */
  mainCheckout: string;
  range: PortRange;
  shared: string;
  stream: string;
  /** Top level of the calling worktree. */
  worktree: string;
  /** Folder name of the worktree, unique per machine. */
  worktreeName: string;
}>;

const invocationCwd = (): string =>
  resolve(process.env.INIT_CWD ?? process.cwd());

export const resolveContext = (cwd = invocationCwd()): Context => {
  const worktree = git(cwd, ['rev-parse', '--show-toplevel']);
  const commonDir = git(cwd, [
    'rev-parse',
    '--path-format=absolute',
    '--git-common-dir',
  ]);
  if (!worktree || !commonDir) {
    throw new Error(`Not inside a git worktree of this repo: ${cwd}`);
  }
  const mainCheckout = dirname(commonDir);
  const worktreeName = basename(worktree);
  const stream = streamOf(worktreeName, basename(mainCheckout));
  return {
    branch: git(cwd, ['branch', '--show-current']) || '(detached)',
    cwd,
    mainCheckout,
    range: rangeOf(stream),
    shared: ensureDir(sharedDirFor(mainCheckout)),
    stream,
    worktree,
    worktreeName,
  };
};
