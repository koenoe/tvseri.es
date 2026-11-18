import { BASE } from './base.ts';
import type { Context } from './context.ts';
import { duration } from './format.ts';
import { runCommand, withHeavySlot } from './heavy.ts';

type Step = Readonly<{
  argv: readonly string[];
  env?: NodeJS.ProcessEnv;
  name: string;
}>;

/** Turbo stays at two parallel tasks: the slot already accounts for a whole job. */
const TURBO_LIMIT = '--concurrency=2';

const checkSteps = (quick: boolean): readonly Step[] => {
  const affected = { TURBO_SCM_BASE: BASE };
  return quick
    ? [
        { argv: ['pnpm', 'format-and-lint'], name: 'format-and-lint' },
        {
          argv: [
            'pnpm',
            'exec',
            'turbo',
            'run',
            'check-types',
            '//#check-types:infra',
            '--affected',
            TURBO_LIMIT,
          ],
          env: affected,
          name: 'check-types (affected)',
        },
        {
          argv: [
            'pnpm',
            'exec',
            'turbo',
            'run',
            'test',
            '--affected',
            TURBO_LIMIT,
          ],
          env: affected,
          name: 'test (affected)',
        },
      ]
    : [
        { argv: ['pnpm', 'format-and-lint'], name: 'format-and-lint' },
        { argv: ['pnpm', 'check-types', TURBO_LIMIT], name: 'check-types' },
        { argv: ['pnpm', 'knip'], name: 'knip' },
        { argv: ['pnpm', 'test', TURBO_LIMIT], name: 'test' },
        {
          argv: ['pnpm', '--filter', '@tvseri.es/web', 'build'],
          name: 'web build',
        },
      ];
};

/** The pre-commit sequence in one heavy slot; stops at the first failure. */
export const checks = async (ctx: Context, argv: readonly string[]) => {
  const quick = argv.includes('--quick');
  const steps = checkSteps(quick);
  const label = `agents:checks${quick ? ' --quick' : ''} (${steps.map((s) => s.name).join(', ')})`;
  const results: string[] = [];
  const code = await withHeavySlot(ctx, { label }, async (slotEnv, onChild) => {
    for (const step of steps) {
      const started = Date.now();
      process.stderr.write(`\n[checks] ${step.name}: ${step.argv.join(' ')}\n`);
      const exit = await runCommand(
        step.argv,
        ctx.worktree,
        { ...slotEnv, ...step.env },
        true,
        onChild,
      );
      const took = duration((Date.now() - started) / 1000);
      results.push(`${exit === 0 ? 'ok  ' : 'FAIL'} ${step.name} (${took})`);
      if (exit !== 0) return exit;
    }
    return 0;
  });
  process.stderr.write(
    `\n[checks] ${quick ? 'quick ' : ''}summary for ${ctx.worktreeName}:\n${results.map((r) => `  ${r}`).join('\n')}\n`,
  );
  return code;
};
