#!/usr/bin/env node
// Shared tooling for parallel coding agents: see tools/agents/README.md.
import { BASE } from './src/base.ts';
import { checks } from './src/checks.ts';
import { resolveContext } from './src/context.ts';
import { e2e } from './src/e2e.ts';
import { gitGuard, sync } from './src/gitGuard.ts';
import { heavy, heavyDir, printHeavyState, pruneStale } from './src/heavy.ts';
import { load } from './src/load.ts';
import { realExec } from './src/real.ts';
import { gcServers, liveness, ps, serve, stop } from './src/serve.ts';
import { status } from './src/status.ts';

const HELP = `Usage: pnpm agents:<command> (or node tools/agents/agents.ts <command>)

  serve <name> [--stub|--real] [--replace] [--ready /path] [--timeout s] [--no-wait] -- <command>
                     start a server on a free port of this worktree's stream ({port} and $PORT)
  stop <name>        stop that server (only the processes it recorded)
  ps [--json]        every registered server, stale entries, unknown listeners
  gc                 drop stale registry entries and heavy locks (never kills anything)
  heavy [--max-wait min] [--no-nice] -- <command>
                     run a heavy job in one of the machine-wide slots (FIFO queue)
  heavy --status     who holds the slots, who waits
  checks [--quick]   pre-commit checks in one heavy slot
  e2e [-- <playwright args>]
                     the web's Playwright run in a heavy slot, on a claimed port block
  status [--json]    every worktree: branch, ahead/behind ${BASE}, dirty files, servers, slots
  load [--max-load n] [--min-free %]
                     load, memory, busiest worktrees; exits 3 when the machine is too busy
  git-guard [status|install|uninstall] [--include-main]
                     the hook that blocks git stash in agent worktrees
  sync [branch]      merge ${BASE} into this branch without stashing (refuses on overlap)
`;

type Command = (
  ctx: ReturnType<typeof resolveContext>,
  argv: readonly string[],
) => number | Promise<number>;

const COMMANDS: Readonly<Record<string, Command>> = {
  checks,
  e2e,
  gc: (ctx) => {
    gcServers(ctx);
    const removed = pruneStale(heavyDir(ctx.shared), liveness());
    for (const record of removed) {
      console.log(
        `Released stale heavy slot/ticket of pid ${record.pid} [${record.worktreeName}] ${record.command}`,
      );
    }
    printHeavyState(heavyDir(ctx.shared));
    return 0;
  },
  'git-guard': gitGuard,
  heavy,
  load,
  ps,
  serve,
  status,
  stop,
  sync,
};

const main = async () => {
  const [name, ...argv] = process.argv.slice(2);
  // Internal: runs inside `sst shell` for `serve --real`.
  if (name === 'real-exec') return realExec(argv);
  const command = name ? COMMANDS[name] : undefined;
  if (!command) {
    console.log(HELP);
    return name && name !== 'help' && name !== '--help' ? 1 : 0;
  }
  return command(resolveContext(), argv);
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  },
);
