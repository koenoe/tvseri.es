import { spawnSync } from 'node:child_process';

export type ExecResult = Readonly<{
  code: number;
  stderr: string;
  stdout: string;
}>;

/** Runs a command without a shell and returns its output (never throws). */
export const exec = (
  command: string,
  args: readonly string[],
  options: Readonly<{ cwd?: string; timeoutMs?: number }> = {},
): ExecResult => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    // C locale: stable `ps -o lstart` and `lsof` output.
    env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    maxBuffer: 32 * 1024 * 1024,
    timeout: options.timeoutMs ?? 30_000,
  });
  return {
    code: result.status ?? 1,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? '',
  };
};

/** Runs git in `cwd`; returns trimmed stdout or undefined on failure. */
export const git = (
  cwd: string,
  args: readonly string[],
): string | undefined => {
  const result = exec('git', args, { cwd });
  return result.code === 0 ? result.stdout.trim() : undefined;
};
