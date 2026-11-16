import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { Context } from './context.ts';

const AGENTS = join(import.meta.dirname, '..', 'agents.ts');

/** The web's settings and the SST resource (`SST_RESOURCE_<name>`) field that holds each. */
const WEB_ENV: Readonly<Record<string, readonly [string, string]>> = {
  API_KEY: ['ApiKey', 'value'],
  API_URL: ['ApiRouter', 'url'],
  AUTH_URL: ['Auth', 'url'],
  SECRET_KEY: ['SessionSecret', 'value'],
};

/**
 * Wraps a web command in `sst shell` (reads the deployed stage's state, never
 * deploys) and `agents real-exec`, which turns the linked resources into the
 * four variables the web reads. Without a stage, sst uses the personal stage
 * of this checkout (`.sst/stage`). Production is refused.
 */
export const realCommand = (
  ctx: Context,
  stage: string,
  argv: readonly string[],
): readonly string[] => {
  if (stage === 'production') {
    throw new Error(
      'Real mode runs against a personal dev stage, never production.',
    );
  }
  return [
    join(ctx.worktree, 'node_modules', '.bin', 'sst'),
    'shell',
    '--config',
    join(ctx.worktree, 'sst.config.ts'),
    ...(stage ? ['--stage', stage] : []),
    '--',
    process.execPath,
    AGENTS,
    'real-exec',
    '--',
    ...argv,
  ];
};

/** The stage `sst shell` resolved (from `--stage`, `.sst/stage` or the env) */
const shellStage = (env: NodeJS.ProcessEnv): unknown => {
  try {
    return (
      JSON.parse(env.SST_RESOURCE_App ?? 'null') as Record<
        string,
        unknown
      > | null
    )?.stage;
  } catch {
    return undefined;
  }
};

/**
 * Builds the web's environment from `SST_RESOURCE_*` and drops everything else
 * `sst shell` injected (other resources' secrets, AWS credentials). Throws
 * with names only, never values. Refuses production a second time, on the
 * stage the shell actually resolved: `realCommand` only sees `--stage`.
 */
export const webEnvFromResources = (
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv => {
  if (shellStage(env) === 'production') {
    throw new Error(
      'Real mode runs against a personal dev stage, never production.',
    );
  }
  const out: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (
      key.startsWith('SST_') ||
      /^AWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY|SESSION_TOKEN)$/.test(key)
    )
      continue;
    out[key] = value;
  }
  const missing: string[] = [];
  for (const [name, [resource, field]] of Object.entries(WEB_ENV)) {
    let value: unknown;
    try {
      value = (
        JSON.parse(env[`SST_RESOURCE_${resource}`] ?? 'null') as Record<
          string,
          unknown
        > | null
      )?.[field];
    } catch {
      value = undefined;
    }
    if (typeof value === 'string' && value) out[name] = value;
    else missing.push(`${name} (SST_RESOURCE_${resource}.${field})`);
  }
  if (missing.length) {
    throw new Error(
      `The stage does not link: ${missing.join(', ')}. Is it deployed?`,
    );
  }
  return out;
};

/** `agents real-exec -- <command>`: runs inside `sst shell`; prints no values. */
export const realExec = (argv: readonly string[]): Promise<number> => {
  const dash = argv.indexOf('--');
  const [command, ...args] = dash === -1 ? argv : argv.slice(dash + 1);
  if (!command) throw new Error('Usage: real-exec -- <command>');
  const env = webEnvFromResources(process.env);
  return new Promise((resolve) => {
    const child = spawn(command, args, { env, stdio: 'inherit' });
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
      process.on(signal, () => child.kill(signal));
    }
    child.on('error', () => resolve(127));
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
};
