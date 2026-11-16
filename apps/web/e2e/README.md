# E2E

Run through `pnpm agents:e2e` (`tools/agents/README.md`). Tags left out by default: `@perf` (timing, `E2E_PERF=1`) and `@design` (pixel-exact design checks, `E2E_DESIGN=1`, the `design` project). Everything else measures relatively (`helpers/viewport.ts`).

`E2E_CLASSIC_SCROLLBARS=1 pnpm agents:e2e` renders as CI does (`ci.yml` sets it): Chromium draws a classic 15px scrollbar instead of the Mac's overlay one. Without it on a machine with classic scrollbars (the runner), Playwright's `--hide-scrollbars` leaves the page reserving the gutter while `clientWidth` reads the whole window, which no browser does.
Run it before pushing a layout check: a spec that passes only without it measures the machine, not the page.

`E2E_SLOW=1 E2E_CLASSIC_SCROLLBARS=1 pnpm agents:e2e -- e2e/<spec>.ts --repeat-each=10` runs as slow as a GitHub macOS runner, to reproduce a runner-only failure: Chromium and `next start` run at macOS's background QoS (`e2e/slow/clamped.sh`: the efficiency cores at low priority; `E2E_SLOW_CLAMP=utility` for less), with two workers. A check that only fails there waited for a time or a frame count instead of the state it needs. A failed CI shard uploads its traces and screenshots as the `e2e-results-shard-N` artifact (`pnpm exec playwright show-trace <zip>`).
