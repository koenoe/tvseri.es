# instant() rig

Read by the `next-cache-components-optimizer` skill; update it when the rig changes.

| | |
|---|---|
| Build | `next build` with `EXPOSE_TESTING_API=1` (compiles Next's testing API in; `experimental.exposeTestingApiInProductionBuild` in `next.config.ts`). Real deployments never set it. |
| Start | `next start --port 3100` (3000 belongs to `sst dev`) |
| Run | `pnpm --filter web e2e` (Playwright's `webServer` builds and starts; set `E2E_PORT` to move it). A server already on the port is reused outside CI: stop it after code changes or the run tests a stale build. |
| Env | No secrets. Playwright starts the stub API (`e2e/stub-api`, port `E2E_PORT + 1000`) and the auth stub (`e2e/stub-auth`, `E2E_PORT + 1100`), and builds and serves with `API_URL`, `AUTH_URL`, `API_KEY=stub` and a made-up `SECRET_KEY`; pages get fixtures from `e2e/stub-api/fixtures/*.ts` (one file per page or stream). Set `E2E_PORT` per worktree so parallel runs don't collide. |
| Auth | `signInAs(context, viewer)` (`e2e/helpers/session.ts`) sets the session cookie on the context before the first navigation; never a helper that navigates `page` before `instant()`. |
| Perf | Timing checks are tagged `@perf` and skipped by default; `E2E_PERF=1` runs them. Wait for `html[data-search-ready]` (set when the search chunk has loaded) instead of `networkidle`, which never settles under a parallel run. |
| Specs | `e2e/instant.spec.ts` (one focused test per route and entry point), `e2e/redirects.spec.ts` (no-follow requests), `e2e/routes.spec.ts` (reserved segments, static 404). |
| Home | `/`'s tests assert the spotlight and the first rows ARE in the static shell (prerendered `use cache` content, built against the stub API). |
| Regenerate (opt-in) | `pnpm --filter web e2e:regenerate` (`playwright.regenerate.config.ts`, about 8 minutes; in an agent worktree `agents.ts e2e -- --config playwright.regenerate.config.ts`). `e2e/regenerate/server.ts` builds with the stub API's port closed (no API), then starts the stub and `next start`; `e2e/regenerate/unavailable.regen.ts` checks `.next/prerender-manifest.json` gives `/genre/crime` and `/discover` the `unavailable` profile's revalidate (its `sMaxAge`, 30 s) and that both fill with API data within the `unavailable` window, no rebuild. Not part of `pnpm e2e`; it rebuilds `.next` without the API, so rebuild before the default suite. |
