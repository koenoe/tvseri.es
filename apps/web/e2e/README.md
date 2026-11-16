# E2E

Run through `pnpm agents:e2e` (`tools/agents/README.md`). Tags left out by default: `@perf` (timing, `E2E_PERF=1`) and `@design` (pixel-exact design checks, `E2E_DESIGN=1`, the `design` project). Everything else measures relatively (`helpers/viewport.ts`).

`E2E_CLASSIC_SCROLLBARS=1 pnpm agents:e2e` renders like GitHub's macOS runners: Chromium draws a classic 15px scrollbar instead of the Mac's overlay one.
Run it before pushing a layout check: a spec that passes only without it measures the machine, not the page.
