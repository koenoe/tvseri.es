import type { Context } from './context.ts';
import { STUB_API_OFFSET, STUB_AUTH_OFFSET } from './context.ts';
import { removeIfUnchanged } from './fsx.ts';
import { runCommand, withHeavySlot } from './heavy.ts';
import { procInfo, tcpListeners } from './proc.ts';
import { claimPortBlock, entryPath, portBlock } from './registry.ts';
import { liveness } from './serve.ts';

/**
 * `agents:e2e [-- <playwright args>]`: the web's Playwright run in a heavy
 * slot, on a port block claimed from the stream's range (E2E_PORT, stub API
 * +1000, auth stub +1100), so parallel runs never share or reuse each
 * other's servers. The claim lasts as long as this process.
 */
export const e2e = async (ctx: Context, argv: readonly string[]) => {
  const dash = argv.indexOf('--');
  const extra = dash === -1 ? argv : argv.slice(dash + 1);
  const command = ['pnpm', '--filter', '@tvseri.es/web', 'e2e', ...extra];
  return withHeavySlot(
    ctx,
    { label: command.join(' ') },
    async (slotEnv, onChild) => {
      const self = {
        lstart: procInfo(process.pid)?.lstart ?? '',
        pid: process.pid,
      };
      const listening = new Set(tcpListeners().map((l) => l.port));
      const entry = claimPortBlock(
        ctx.shared,
        ctx.range,
        listening,
        liveness(),
        (port) => ({
          branch: ctx.branch,
          claim: self,
          command: command.join(' '),
          mode: 'e2e',
          name: 'e2e',
          port,
          ports: portBlock(port),
          procs: [],
          startedAt: new Date().toISOString(),
          stream: ctx.stream,
          url: `http://localhost:${port}`,
          worktree: ctx.worktree,
          worktreeName: ctx.worktreeName,
        }),
      );
      if (!entry) {
        console.error(
          `No free port block in ${ctx.range.first}–${ctx.range.last}; see \`pnpm agents:ps\`.`,
        );
        return 1;
      }
      const path = entryPath(ctx.shared, entry.port);
      const release = () => removeIfUnchanged(path, entry);
      process.once('exit', release);
      console.error(
        `[e2e] E2E_PORT=${entry.port} (stub API ${entry.port + STUB_API_OFFSET}, auth stub ${entry.port + STUB_AUTH_OFFSET})`,
      );
      try {
        return await runCommand(
          command,
          ctx.worktree,
          {
            ...slotEnv,
            E2E_PORT: String(entry.port),
            STUB_API_PORT: String(entry.port + STUB_API_OFFSET),
            STUB_AUTH_PORT: String(entry.port + STUB_AUTH_OFFSET),
          },
          true,
          onChild,
        );
      } finally {
        release();
        process.off('exit', release);
      }
    },
  );
};
