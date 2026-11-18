/**
 * The server for `playwright.regenerate.config.ts`: builds with no API
 * reachable (`API_URL` points at the stub's port while nothing listens
 * there), then starts the stub API and `next start`. Pages prerendered during
 * the outage hold their placeholders on the `unavailable` profile; the spec
 * checks they fill without a rebuild. Run by Playwright's `webServer`, which
 * kills the process group when the run ends.
 *
 * Env: `E2E_PORT` (Next), `STUB_API_PORT` (the stub, down during the build).
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import path from 'node:path';

const port = Number(process.env.E2E_PORT ?? 3100);
const stubPort = Number(process.env.STUB_API_PORT ?? port + 1000);
const webDir = path.resolve(import.meta.dirname, '../..');
const env = {
  ...process.env,
  API_KEY: 'stub',
  API_URL: `http://localhost:${stubPort}`,
  EXPOSE_TESTING_API: '1',
  STUB_API_PORT: String(stubPort),
};

/** Whether something already answers on the port */
const listening = (target: number) =>
  new Promise<boolean>((resolve) => {
    const socket = connect(target, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

const children: ChildProcess[] = [];
const run = (command: string, args: ReadonlyArray<string>) => {
  const child = spawn(command, args, { cwd: webDir, env, stdio: 'inherit' });
  children.push(child);
  return child;
};
const stopAll = () => {
  for (const child of children) {
    child.kill('SIGTERM');
  }
};
process.once('SIGTERM', () => {
  stopAll();
  process.exit(0);
});
process.once('SIGINT', () => {
  stopAll();
  process.exit(0);
});

if (await listening(stubPort)) {
  console.error(
    `[regenerate] port ${stubPort} is in use: the build must run with no API`,
  );
  process.exit(1);
}

const buildStart = Date.now();
const build = run('pnpm', ['exec', 'next', 'build']);
const code = await new Promise<number | null>((resolve) =>
  build.once('exit', resolve),
);
if (code !== 0) {
  console.error(`[regenerate] next build failed (${code})`);
  process.exit(1);
}
const builtAt = Date.now();
console.error(
  `[regenerate] built with no API in ${Math.round((builtAt - buildStart) / 1000)} s`,
);

run('node', ['e2e/stub-api/server.ts']);
run('pnpm', ['exec', 'next', 'start', '--port', String(port)]);
// The spec reads when the outage ended (the stub came up) for its timings
writeFileSync(
  path.join(webDir, '.next', 'regenerate-timing.json'),
  JSON.stringify({ apiUpAt: Date.now(), builtAt }),
);
