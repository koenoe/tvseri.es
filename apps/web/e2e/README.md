# E2E

Run through `pnpm agents:e2e` (`tools/agents/README.md`). Tags left out by default: `@perf` (timing, `E2E_PERF=1`) and `@design` (pixel-exact design checks, `E2E_DESIGN=1`, the `design` project). Everything else measures relatively (`helpers/viewport.ts`).

`E2E_CLASSIC_SCROLLBARS=1 pnpm agents:e2e` renders as CI does (`ci.yml` sets it): Chromium draws a classic 15px scrollbar instead of the Mac's overlay one. Without it on a machine with classic scrollbars (the runner), Playwright's `--hide-scrollbars` leaves the page reserving the gutter while `clientWidth` reads the whole window, which no browser does.
Run it before pushing a layout check: a spec that passes only without it measures the machine, not the page.

`E2E_SLOW=1 E2E_CLASSIC_SCROLLBARS=1 pnpm agents:e2e -- e2e/<spec>.ts --repeat-each=10` runs as slow as a GitHub macOS runner, to reproduce a runner-only failure: Chromium and `next start` run at macOS's background QoS (`e2e/slow/clamped.sh`: the efficiency cores at low priority; `E2E_SLOW_CLAMP=utility` for less), with two workers (`E2E_SLOW_WORKERS`) and three times the timeouts. A check that only fails there waited for a time or a frame count instead of the state it needs. A failed CI shard uploads its traces and screenshots as the `e2e-results-shard-N` artifact (`pnpm exec playwright show-trace <zip>`).

## What belongs here

The browser suite covers what only a real browser can show. It should be green on every run.

- **Keep:** user journeys (sign in, mark, Undo, import, search, navigate and Back), routing, outages and security headers, and regression tests for real bugs that only a browser reproduces, with the bug named in the test.
- **Don't add:** frame sampling, timing or settle waits, exact-pixel checks, or page × width matrices. They failed far more often for the machine than for the app. When a layout rule matters, put it in a unit test, or in one representative browser check that measures relatively.
- **Prefer unit tests** (Vitest, next to the code) for rules: marking, dates, counts, permissions, import parsing. A test earns its place only if it fails when something real breaks. Don't pin class lists or internals.
- **Wait for state, never for time.** Wait for an attribute, a role or a request, not `waitForTimeout` or a frame count.
- Placeholder parity (the first paint matches the loading skeleton): one check per page type is enough.
- The stub API (`stub-api/`) holds only what the remaining journeys need. Every route it fakes is another copy of the API to keep in sync.
