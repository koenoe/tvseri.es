import { spawn } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALL_AGENT_PORTS,
  type Context,
  STUB_API_OFFSET,
  STUB_AUTH_OFFSET,
} from './context.ts';
import { duration, since, table, truncate } from './format.ts';
import { ensureDir, removeIfUnchanged, writeJsonAtomic } from './fsx.ts';
import {
  allProcs,
  type Listener,
  type ProcIdentity,
  processCwds,
  procInfo,
  stopGroup,
  tcpListeners,
} from './proc.ts';
import { realCommand } from './real.ts';
import {
  claimPortBlock,
  entryPath,
  isStale,
  type Liveness,
  type LoadedEntry,
  loadEntries,
  type ServerEntry,
  type ServerMode,
  type ServerProc,
  type ServerRole,
} from './registry.ts';

/** Fake, local-only value shared by the web and the auth stub (the e2e rig's). Never a real secret. */
const STUB_SECRET = 'local-stub-only';

/** A snapshot of this user's processes, for liveness checks. */
export const liveness = (): Liveness => {
  const procs = allProcs();
  const byPid = new Map(procs.map((info) => [info.pid, info]));
  const groups = new Set(procs.map((info) => info.pgid));
  return {
    hasGroup: (pgid) => groups.has(pgid),
    isSame: (identity) => byPid.get(identity.pid)?.lstart === identity.lstart,
  };
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const substitutePort = (
  args: readonly string[],
  ports: Readonly<Record<string, number>>,
): readonly string[] =>
  args.map((arg) =>
    arg.replace(/\{(port|stubApiPort|stubAuthPort)\}/g, (_, key: string) =>
      String(ports[key]),
    ),
  );

/** One argument with spaces runs through `sh -c`; several run as argv. */
export const toArgv = (args: readonly string[]): readonly string[] =>
  args.length === 1 && /\s/.test(args[0] ?? '')
    ? ['/bin/sh', '-c', args[0] ?? '']
    : args;

const shellQuote = (arg: string): string =>
  /^[\w@%+=:,./{}-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;

const commandText = (argv: readonly string[]): string =>
  argv.map(shellQuote).join(' ');

type Launch = Readonly<{
  argv: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  log: string;
  port: number;
  readyPath: string;
  role: ServerRole;
}>;

/** Starts a detached process in its own group, logging to `log`. */
const launch = (spec: Launch): ServerProc => {
  const [command, ...args] = spec.argv;
  if (!command) throw new Error('Empty command');
  const fd = openSync(spec.log, 'w');
  const child = spawn(command, args, {
    cwd: spec.cwd,
    detached: true,
    env: spec.env,
    stdio: ['ignore', fd, fd],
  });
  closeSync(fd);
  child.unref();
  const pid = child.pid;
  if (pid === undefined) throw new Error(`Could not start: ${command}`);
  const info = procInfo(pid);
  return {
    command: commandText(spec.argv),
    log: spec.log,
    lstart: info?.lstart ?? '',
    pid,
    port: spec.port,
    role: spec.role,
  };
};

const httpAnswers = async (url: string): Promise<boolean> => {
  try {
    await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    return true;
  } catch {
    return false;
  }
};

const logTail = (log: string, lines = 25): string => {
  try {
    return readFileSync(log, 'utf8').split('\n').slice(-lines).join('\n');
  } catch {
    return '';
  }
};

type ServeOptions = Readonly<{
  auth: StubAuthKind | undefined;
  command: readonly string[];
  cwd: string;
  mode: ServerMode;
  name: string;
  readyPath: string;
  replace: boolean;
  stage: string;
  timeoutSec: number;
  wait: boolean;
}>;

const parseServeArgs = (
  argv: readonly string[],
  ctx: Context,
): ServeOptions => {
  const dash = argv.indexOf('--');
  const flags = dash === -1 ? argv : argv.slice(0, dash);
  let command = dash === -1 ? [] : argv.slice(dash + 1);
  let name = '';
  let mode: ServerMode = 'plain';
  let readyPath = '/';
  let auth: StubAuthKind | undefined;
  let replace = false;
  let timeoutSec = 300;
  let wait = true;
  let cwd = ctx.cwd;
  let stage = process.env.AGENTS_REAL_STAGE ?? '';
  for (let i = 0; i < flags.length; i += 1) {
    const flag = flags[i] ?? '';
    const value = () => {
      i += 1;
      const next = flags[i];
      if (next === undefined) throw new Error(`${flag} needs a value`);
      return next;
    };
    if (flag === '--stub') mode = 'stub';
    else if (flag === '--real') mode = 'real';
    else if (flag === '--auth') {
      const kind = value();
      if (kind !== 'home' && kind !== 'show') {
        throw new Error('--auth takes home or show');
      }
      auth = kind;
    } else if (flag === '--replace') replace = true;
    else if (flag === '--no-wait') wait = false;
    else if (flag === '--ready') readyPath = value();
    else if (flag === '--timeout') timeoutSec = Number(value());
    else if (flag === '--cwd') cwd = value();
    else if (flag === '--stage') stage = value();
    else if (flag.startsWith('-')) throw new Error(`Unknown flag ${flag}`);
    else if (!name) name = flag;
    else if (dash === -1) {
      // No `--`: everything after the name is the command.
      command = flags.slice(i);
      break;
    }
  }
  if (!/^[\w.-]+$/.test(name)) {
    throw new Error('Give the server a name: agents:serve <name> -- <command>');
  }
  return {
    auth,
    command,
    cwd,
    mode,
    name,
    readyPath,
    replace,
    stage,
    timeoutSec,
    wait,
  };
};

const findMine = (ctx: Context, name: string): readonly LoadedEntry[] =>
  loadEntries(ctx.shared).filter(
    ({ entry }) => entry.worktree === ctx.worktree && entry.name === name,
  );

const webDir = (ctx: Context): string => join(ctx.worktree, 'apps', 'web');

/** `--auth home` picks Home's issuer (viewers nina and sam) even when the show rig's stub-auth exists */
type StubAuthKind = 'home' | 'show';

type StubAuth = Readonly<{
  kind: StubAuthKind;
  path: string;
  servesAssets: boolean;
}>;

/**
 * The auth stub on this branch, relative to apps/web: the show rig's
 * (`e2e/stub-auth`, also serves fixture images) or Home's issuer
 * (`e2e/stub-api/issuer.ts`). Both read `STUB_AUTH_PORT` and `SECRET_KEY`.
 */
const STUB_AUTHS: readonly StubAuth[] = [
  { kind: 'show', path: 'e2e/stub-auth/server.ts', servesAssets: true },
  { kind: 'home', path: 'e2e/stub-api/issuer.ts', servesAssets: false },
];

const findStubAuth = (
  web: string,
  auth: StubAuthKind | undefined,
): StubAuth | undefined =>
  STUB_AUTHS.find(
    (candidate) =>
      (!auth || candidate.kind === auth) &&
      existsSync(join(web, candidate.path)),
  );

/** Stops every process of an entry (verified by PID + start time) and drops it. */
const stopEntry = async (loaded: LoadedEntry): Promise<void> => {
  const { entry } = loaded;
  for (const proc of [...entry.procs].reverse()) {
    const outcome = await stopGroup(proc);
    console.log(`  ${proc.role} pid ${proc.pid}: ${outcome}`);
    if (outcome === 'not-ours') {
      console.log(
        `  PID ${proc.pid} now belongs to another process; left it alone.`,
      );
    }
  }
  removeIfUnchanged(loaded.path, entry);
};

export const serve = async (ctx: Context, argv: readonly string[]) => {
  const options = parseServeArgs(argv, ctx);
  const existing = findMine(ctx, options.name);
  const live = liveness();
  for (const loaded of existing) {
    if (isStale(loaded.entry, live)) {
      removeIfUnchanged(loaded.path, loaded.entry);
    } else if (options.replace) {
      console.log(`Replacing ${options.name} at ${loaded.entry.url}`);
      await stopEntry(loaded);
    } else {
      console.log(
        `${options.name} already runs for this worktree at ${loaded.entry.url} (pid ${loaded.entry.procs[0]?.pid}). Use --replace to restart it.`,
      );
      return 0;
    }
  }

  const needsWeb = options.mode !== 'plain';
  const command =
    options.command.length > 0
      ? options.command
      : needsWeb
        ? ['pnpm', 'exec', 'next', 'dev', '--port', '{port}']
        : [];
  if (command.length === 0) {
    throw new Error('Missing command: agents:serve <name> -- <command>');
  }
  const cwd =
    needsWeb && options.command.length === 0 ? webDir(ctx) : options.cwd;
  if (
    options.mode === 'stub' &&
    !existsSync(join(webDir(ctx), 'e2e', 'stub-api', 'server.ts'))
  ) {
    throw new Error(
      'This branch has no stub API (apps/web/e2e/stub-api). Merge `redesign` first.',
    );
  }
  const stubAuthScript =
    options.mode === 'stub'
      ? findStubAuth(webDir(ctx), options.auth)
      : undefined;
  if (options.mode === 'stub' && !stubAuthScript) {
    console.log(
      'No auth stub on this branch (apps/web/e2e/stub-auth or e2e/stub-api/issuer.ts): starting the stub API and the web only, always signed out.',
    );
  }

  const listening = new Set(tcpListeners().map((l) => l.port));
  const logs = ensureDir(join(ctx.shared, 'logs'));
  const startedAt = new Date().toISOString();
  const self: ProcIdentity = {
    lstart: procInfo(process.pid)?.lstart ?? '',
    pid: process.pid,
  };
  const entry = claimPortBlock(
    ctx.shared,
    ctx.range,
    listening,
    live,
    (port) => ({
      branch: ctx.branch,
      claim: self,
      command: commandText(command),
      mode: options.mode,
      name: options.name,
      port,
      ports:
        options.mode === 'stub'
          ? [port, port + STUB_API_OFFSET, port + STUB_AUTH_OFFSET]
          : [port],
      procs: [],
      startedAt,
      stream: ctx.stream,
      url: `http://localhost:${port}`,
      worktree: ctx.worktree,
      worktreeName: ctx.worktreeName,
    }),
  );
  if (!entry) {
    console.error(
      `No free port block in ${ctx.stream}'s range ${ctx.range.first}–${ctx.range.last}. Run \`pnpm agents:ps\` and stop a server you own.`,
    );
    return 1;
  }

  const port = entry.port;
  const stubApi = port + STUB_API_OFFSET;
  const stubAuth = port + STUB_AUTH_OFFSET;
  const ports = { port, stubApiPort: stubApi, stubAuthPort: stubAuth };
  const logFor = (role: ServerRole) =>
    join(
      logs,
      `${ctx.worktreeName}--${options.name}${role === 'web' ? '' : `--${role}`}.log`,
    );
  const baseEnv = { ...process.env, AGENTS_SERVER: options.name };
  const launches: Launch[] = [];
  // The show rig's auth stub also serves the fixtures' images (STUB_ASSETS_URL).
  const assetsEnv = stubAuthScript?.servesAssets
    ? { STUB_ASSETS_URL: `http://localhost:${stubAuth}` }
    : {};
  const authEnv = stubAuthScript
    ? {
        ...assetsEnv,
        AUTH_URL: `http://localhost:${stubAuth}`,
        SECRET_KEY: STUB_SECRET,
      }
    : {};
  if (options.mode === 'stub') {
    launches.push({
      argv: ['node', 'e2e/stub-api/server.ts'],
      cwd: webDir(ctx),
      env: {
        ...baseEnv,
        PORT: String(stubApi),
        STUB_API_PORT: String(stubApi),
        ...assetsEnv,
      },
      log: logFor('stub-api'),
      port: stubApi,
      readyPath: '/health',
      role: 'stub-api',
    });
  }
  if (stubAuthScript) {
    launches.push({
      argv: ['node', '--conditions=react-server', stubAuthScript.path],
      cwd: webDir(ctx),
      env: {
        ...baseEnv,
        PORT: String(stubAuth),
        SECRET_KEY: STUB_SECRET,
        STUB_AUTH_PORT: String(stubAuth),
      },
      log: logFor('stub-auth'),
      port: stubAuth,
      readyPath: '/.well-known/jwks.json',
      role: 'stub-auth',
    });
  }
  const webArgv = substitutePort(toArgv(command), ports);
  launches.push({
    argv:
      options.mode === 'real'
        ? realCommand(ctx, options.stage, webArgv)
        : webArgv,
    cwd,
    env:
      options.mode === 'stub'
        ? {
            ...baseEnv,
            API_KEY: 'stub',
            API_URL: `http://localhost:${stubApi}`,
            PORT: String(port),
            ...authEnv,
          }
        : { ...baseEnv, PORT: String(port) },
    log: logFor('web'),
    port,
    readyPath: options.readyPath,
    role: 'web',
  });

  const procs: ServerProc[] = [];
  let current: ServerEntry = entry;
  const path = entryPath(ctx.shared, port);
  for (const spec of launches) {
    procs.push(launch(spec));
    current = { ...entry, procs: [...procs] };
    writeJsonAtomic(path, current);
  }
  console.log(`${options.name} (${options.mode}) → ${entry.url}`);
  for (const proc of procs) {
    console.log(
      `  ${proc.role.padEnd(9)} :${proc.port}  pid ${proc.pid}  log ${proc.log}`,
    );
  }
  if (!options.wait) return 0;

  const deadline = Date.now() + options.timeoutSec * 1000;
  const started = Date.now();
  for (const spec of launches) {
    const proc = procs.find((p) => p.role === spec.role);
    if (!proc) continue;
    const url = `http://localhost:${spec.port}${spec.readyPath}`;
    let lastNote = Date.now();
    for (;;) {
      if (await httpAnswers(url)) break;
      const live = liveness();
      if (!live.isSame(proc)) {
        console.error(
          `\n${spec.role} exited before it answered. Last log lines:\n${logTail(proc.log)}`,
        );
        await stopEntry({ entry: current, path });
        return 1;
      }
      if (Date.now() > deadline) {
        console.error(
          `\n${spec.role} did not answer ${url} within ${options.timeoutSec}s; it is still running (log ${proc.log}). Stop it with \`pnpm agents:stop ${options.name}\`.`,
        );
        return 2;
      }
      if (Date.now() - lastNote > 15_000) {
        lastNote = Date.now();
        console.log(
          `  waiting for ${url} (${duration((Date.now() - started) / 1000)})`,
        );
      }
      await sleep(1000);
    }
  }
  console.log(
    `Ready: ${entry.url} (${duration((Date.now() - started) / 1000)})`,
  );
  return 0;
};

export const stop = async (ctx: Context, argv: readonly string[]) => {
  const name = argv[0];
  if (!name) throw new Error('Usage: agents:stop <name>');
  const mine = findMine(ctx, name);
  if (mine.length === 0) {
    console.log(
      `No server named ${name} for ${ctx.worktreeName}. See \`pnpm agents:ps\`.`,
    );
    return 1;
  }
  for (const loaded of mine) {
    console.log(`Stopping ${name} (${loaded.entry.url})`);
    await stopEntry(loaded);
  }
  return 0;
};

type Unknown = Listener & Readonly<{ command: string; cwd: string }>;

const inAgentRange = (port: number) =>
  ALL_AGENT_PORTS.some((range) => port >= range.first && port <= range.last);

/** Listeners on agent ports that no registry entry started. */
const unknownListeners = (
  entries: readonly LoadedEntry[],
): readonly Unknown[] => {
  const procs = allProcs();
  const pgidOf = new Map(procs.map((info) => [info.pid, info.pgid]));
  const ours = new Set(
    entries.flatMap(({ entry }) => entry.procs.map((p) => p.pid)),
  );
  // Playwright's servers under agents:e2e are not recorded one by one: their ports are.
  const e2ePorts = new Set(
    entries.flatMap(({ entry }) => (entry.mode === 'e2e' ? entry.ports : [])),
  );
  const strays = tcpListeners().filter(
    (l) =>
      inAgentRange(l.port) &&
      !e2ePorts.has(l.port) &&
      !ours.has(pgidOf.get(l.pid) ?? -1),
  );
  const cwds = processCwds([...new Set(strays.map((l) => l.pid))]);
  return strays.map((l) => ({
    ...l,
    command: procs.find((info) => info.pid === l.pid)?.command ?? '?',
    cwd: cwds.get(l.pid) ?? '?',
  }));
};

const entryState = (entry: ServerEntry, live: Liveness): string => {
  if (isStale(entry, live)) return 'STALE';
  // A group outlives its leader (e.g. `sh -c` exiting first); its id is never reused while members live.
  const alive = entry.procs.filter(
    (p) => live.isSame(p) || live.hasGroup(p.pid),
  ).length;
  if (entry.procs.length === 0) return 'starting';
  return alive === entry.procs.length
    ? 'running'
    : `partial ${alive}/${entry.procs.length}`;
};

export const ps = (ctx: Context, argv: readonly string[]) => {
  const entries = loadEntries(ctx.shared);
  const live = liveness();
  const rows = entries.map(({ entry }) => [
    entry.worktreeName,
    entry.name,
    entry.mode,
    entry.ports.join(','),
    String(entry.procs[0]?.pid ?? entry.claim.pid),
    entryState(entry, live),
    since(entry.startedAt),
    truncate(entry.command, 50),
  ]);
  if (argv.includes('--json')) {
    console.log(
      JSON.stringify(
        entries.map(({ entry }) => ({
          ...entry,
          state: entryState(entry, live),
        })),
        null,
        2,
      ),
    );
    return 0;
  }
  console.log(
    rows.length
      ? table(
          [
            'WORKTREE',
            'NAME',
            'MODE',
            'PORTS',
            'PID',
            'STATE',
            'UP',
            'COMMAND',
          ],
          rows,
        )
      : 'No registered servers.',
  );
  const strays = unknownListeners(entries);
  if (strays.length) {
    console.log(
      '\nListeners on agent ports the registry does not know (not touched):',
    );
    console.log(
      table(
        ['PORT', 'PID', 'CWD', 'COMMAND'],
        strays.map((s) => [
          String(s.port),
          String(s.pid),
          s.cwd,
          truncate(s.command, 60),
        ]),
      ),
    );
  }
  if (rows.some((row) => row[5] === 'STALE'))
    console.log('\nRun `pnpm agents:gc` to drop STALE entries.');
  return 0;
};

/** Drops registry entries whose processes are gone; reports, never kills, unknown listeners. */
export const gcServers = (ctx: Context): number => {
  const entries = loadEntries(ctx.shared);
  const live = liveness();
  let removed = 0;
  for (const loaded of entries) {
    if (
      isStale(loaded.entry, live) &&
      removeIfUnchanged(loaded.path, loaded.entry)
    ) {
      removed += 1;
      console.log(
        `Removed stale ${loaded.entry.worktreeName}/${loaded.entry.name} (:${loaded.entry.port})`,
      );
    }
  }
  const strays = unknownListeners(
    entries.filter((l) => !isStale(l.entry, live)),
  );
  for (const s of strays) {
    console.log(
      `Unknown listener on :${s.port}: pid ${s.pid} in ${s.cwd} (${truncate(s.command, 60)}). Not touched; its owner must stop it.`,
    );
  }
  return removed;
};
