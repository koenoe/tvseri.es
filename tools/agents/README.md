# Agent tooling

Small, dependency-free Node scripts (Node 24 runs the `.ts` files directly) that let many coding agents share one laptop: servers on their own ports, heavy jobs in a queue, no stray kills. Run them from any worktree of this repo; they work out the worktree, its stream and its port range themselves.

Shared state lives outside every worktree, in `.tvseries-agents/` next to the main checkout (set `TVSERIES_AGENTS_DIR` to move it):

```
servers/<port>.json   one entry per running server (PIDs, start times, ports, command, log)
logs/                 server logs, <worktree>--<name>[--role].log
heavy/config.json     {"slots": 2, "maxWaitMinutes": 60}
heavy/queue/          waiting heavy jobs (FIFO by file name)
heavy/slots/          held slots
```

## Servers

```bash
pnpm agents:serve web -- pnpm --filter @tvseri.es/web exec next dev --port {port}
pnpm agents:serve web --stub          # stub API + auth stub + next dev, wired together
pnpm agents:serve web --stub --auth home   # same, with Home's issuer (viewers nina = member, sam = new user)
pnpm agents:stop web
pnpm agents:ps                        # every stream's servers, STALE entries, unknown listeners
pnpm agents:gc                        # drop stale entries and heavy locks; never kills anything
```

- The port comes from the stream's range (folder `tvseri.es-<stream>[-…]`): show 3110–3119, global 3120–3129, home 3130–3139, discover 3140–3149, profile 3150–3159, stats 3160–3169, person 3170–3179, settings 3180–3189, anything else 3190–3199. A claim reserves the port and its stub ports (+1000 stub API, +1100 auth stub, the e2e rig's convention); a block with a port that fetch refuses (4190, so 3190) is skipped. Port 3000 is never used.
- The command gets the port as `{port}` (also `{stubApiPort}`, `{stubAuthPort}`) and as `$PORT`. One quoted argument with spaces runs through `sh -c`.
- `serve` waits until the server answers HTTP on `--ready <path>` (default `/`, any status counts; `--timeout` seconds, default 300; `--no-wait` to skip), then prints the URL. A server that exits early prints its last log lines and is cleaned up. A name already running in this worktree is reported, not restarted; `--replace` restarts it.
- Each server runs detached in its own process group. `stop` signals that group only (SIGTERM, then SIGKILL after 10 s), and only after checking that the recorded PID still has the recorded start time; a reused PID is left alone. Nothing here kills by name, pattern or port.
- `--stub` needs `apps/web/e2e/stub-api` on your branch. It starts the stub API on +1000, the auth stub on +1100 and the web on the port with `API_URL`, `API_KEY=stub`, `AUTH_URL` and the rig's fake `SECRET_KEY`. The auth stub is `apps/web/e2e/stub-auth/server.ts` (it also serves fixture images as `STUB_ASSETS_URL`); `--auth home` picks Home's issuer `apps/web/e2e/stub-api/issuer.ts` instead (sign-in steps in `apps/web/e2e/stub-api/README.md`). On a branch with neither it starts only the stub API and the web, which is then always signed out. Without a command it runs `pnpm exec next dev --port {port}` in `apps/web`; pass one to run something else (for example `-- pnpm exec next start --port {port}` after a build).

## Heavy jobs

```bash
pnpm agents:heavy -- pnpm --filter @tvseri.es/web build
pnpm agents:heavy -- pnpm exec playwright test   # prefer agents:e2e for the web suite
pnpm agents:heavy --status
pnpm agents:checks            # format-and-lint, check-types, knip, test, web build
pnpm agents:checks --quick    # format-and-lint, then types and tests of packages changed since the base branch (`main`; `AGENTS_BASE` overrides it)
```

- A machine-wide counting semaphore: `slots` jobs at a time (default 2, `heavy/config.json`; `AGENTS_HEAVY_SLOTS` overrides per call). Waiters queue FIFO and see their position and who holds the slots.
- A slot is an exclusive lock file with the wrapper's PID, the job's PID, start times and a heartbeat. It is released when the job exits, on Ctrl-C/SIGTERM, and, if the wrapper is killed, by the next waiter once both processes are gone.
- `--max-wait <minutes>` (default 60) gives up with exit code 75: back off and retry later. Jobs run at nice 10 (`--no-nice` to skip). A heavy job that calls `agents:heavy` again reuses its slot.
- `agents:checks` holds one slot for the whole sequence, stops at the first failure and prints a summary. Turbo runs at `--concurrency=2` inside it.

Rule: `next build`, Playwright, full `pnpm test`, `pnpm check-types` and `pnpm knip` never run outside `agents:heavy` / `agents:checks`. A single Vitest file in watch-less mode (`pnpm --filter … exec vitest run path`) is fine without a slot.

## Real data (`--real`)

```bash
pnpm agents:serve web --real                  # next dev against the personal dev stage
pnpm agents:serve web --real --stage <name>   # another deployed dev stage (or AGENTS_REAL_STAGE)
```

- The web reads `API_URL`, `API_KEY`, `AUTH_URL` and `SECRET_KEY` from `process.env` (`sst dev` writes them into `apps/web/.env.local` for the main checkout only). They are not links of the web, but the stage links `ApiRouter`, `Auth`, `ApiKey` and `SessionSecret`.
- `--real` runs the server as `sst shell --config <worktree>/sst.config.ts [--stage …] -- agents real-exec -- <command>`. `sst shell` reads the deployed stage's state and injects every linked resource as `SST_RESOURCE_*` (plus AWS credentials). It deploys nothing. `real-exec` turns the four resources into the four variables, drops all other `SST_RESOURCE_*` and the AWS credentials, and starts the command. No value is printed; a missing resource is reported by name.
- Without `--stage`, sst uses the checkout's personal stage (`.sst/stage`, else the OS username). The stage must already be deployed (`sst dev` or `sst deploy --dev` by the developer). `production` is refused.
- Sessions: cookies on `localhost` are shared across ports, and the web uses the stage's real `SECRET_KEY`, so a session from your `localhost:3000` works on every `--real` server.
- Limits: the values do sit in the server processes' environment, which any process of the same user can read (`ps -E`). Agents must not inspect it. A local server also talks to the real dev API, so its writes are real (dev stage only).

## Playwright

```bash
pnpm agents:e2e                       # pnpm --filter @tvseri.es/web e2e, in a heavy slot
pnpm agents:e2e -- e2e/show.spec.ts   # extra args go to Playwright
```

It claims a port block like `serve` and passes `E2E_PORT`, `STUB_API_PORT` (+1000) and `STUB_AUTH_PORT` (+1100), so no run reuses another worktree's servers (`reuseExistingServer` is on locally). The claim lasts as long as the run.

## Git safety

```bash
pnpm agents:git-guard install   # once per new worktree (status / uninstall too)
pnpm agents:sync                # merge `main` into this branch, no stash
```

- `git stash` can't be blocked with an alias (git ignores aliases that shadow built-ins), and there is no pre-stash hook. The guard is a `reference-transaction` hook (`git-guard/reference-transaction`) that refuses any update of `refs/stash` (push, save, store, pop, drop of the top entry, clear) with a message pointing here. Before any change to the working tree, `git stash push` stores its ref, so a refused stash leaves your files as they were.
- `install` copies it into every worktree's hooks folder (`core.hooksPath` is `.husky/_`, which is per worktree and ignored, and husky keeps unknown files there). The main checkout is skipped unless you pass `--include-main`. New worktrees need `install` again; `agents:status` shows `GUARD missing`.
- lint-staged's own backup (`git stash store` from the pre-commit hook) is let through: the hook allows a stash update when git's parent process is the lint-staged Node process. lint-staged 17 finds its backup by hash, so concurrent commits in two worktrees don't mix them up.
- Not covered: `git stash apply` and `git stash drop stash@{n}` for n > 0 change no ref (only the reflog), so they pass. `git -c core.hooksPath=…` bypasses every hook; never do it.
- `sync` merges `main` (or `AGENTS_BASE`, or the branch you name) into the current stream branch. It never fetches or stashes. It merges when the tree is clean. With a dirty tree it merges only if no dirty file also changes in the base branch and `git merge-tree` predicts no conflict; otherwise it refuses and tells you to commit first. It refuses during a merge/rebase, on the base branch itself and in the main checkout.

## Overview and laptop health

```bash
pnpm agents:status [--json]   # every worktree: branch, +ahead/-behind main, last commit, dirty files, servers, heavy slots, guard
pnpm agents:load              # load, memory, swap, busiest worktrees; exit 3 when busy
```

- `status` also writes `.tvseries-agents/status.json`.
- `load` exits 3 when the 1-minute load is above `--max-load` (default 1.5 × cores) or free memory is below `--min-free` percent (default 10). It attributes the 60 busiest processes to worktrees by cwd, command line or nearest ancestor (Chrome under Playwright, Next workers).

## Tests

`pnpm --filter @tvseri.es/agents-tools test` (Vitest) covers the parsing, the port claims and the semaphore against a temp directory with a fake process table.
