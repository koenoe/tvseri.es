# Stub API

A local stand-in for the API so pages render with realistic data without secrets or `sst dev`.

```bash
# terminal 1 (from apps/web)
STUB_API_PORT=3190 node e2e/stub-api/server.ts
# terminal 2
API_URL=http://localhost:3190 API_KEY=stub pnpm exec next dev --port 3101
```

- Every file in `fixtures/` exports `routes: readonly StubRoute[]` (see `types.ts`); add your own file per page or stream instead of editing a shared one. Shape bodies with the `@tvseri.es/schemas` types (`satisfies`), type-only imports.
- The key must be `stub` (mirrors the API's `x-api-key` check). Unknown routes answer 404 JSON.
- `STUB_API_DELAY_MS=600` slows every response (pending states).
- `STUB_API_IMAGES=nologo` (no logos) or `one` (one backdrop, no logos) for the admin picker's sparse states.
- No auth: a local server without `SECRET_KEY` is always signed out.

## Show page locally

`fixtures/show.ts` serves the show page's data and viewer routes; `stub-auth` (see `../stub-auth/README.md`) signs viewers in and serves the images. Three terminals, from `apps/web`:

```bash
# 1. stub API
STUB_API_PORT=4116 STUB_ASSETS_URL=http://localhost:4216 node e2e/stub-api/server.ts
# 2. auth + images stub (STUB_IMG_DIR: a local, uncommitted folder of images; SECRET_KEY: a fake value, never a real secret)
SECRET_KEY=local-stub-only STUB_AUTH_PORT=4216 STUB_IMG_DIR=<folder with the board images> \
  node --conditions=react-server e2e/stub-auth/server.ts
# 3. the web app
API_URL=http://localhost:4116 API_KEY=stub AUTH_URL=http://localhost:4216 SECRET_KEY=local-stub-only \
  STUB_ASSETS_URL=http://localhost:4216 pnpm exec next dev --port 3116
```

Open `http://localhost:3116/136315/the-bear`. Without images (`STUB_IMG_DIR` unset) image fields are `''`.

| Id | Show | Demonstrates |
| --- | --- | --- |
| 136315 | The Bear (`the-bear`) | 5 seasons, 47 episodes (8, 10, 10, 10, 9), all aired, ended; the default show |
| 900001 | The Bear, airing | Season 5 weekly: 41 of 47 out, next episode Fri 13 Nov 2026 (S05E04) |
| 900002 | The Long Run | 14 seasons, Season 7 has 200 episodes (Show all, "Go to season") |
| 900003 | Evening Edition | 1,200 aired episodes in 24 seasons: the show mark answers 413, season marks work |
| 900004 | Harbour Lights | The median show (placeholder checks) |
| 900005 | Before the Premiere | Premieres Sun 15 Nov 2026: nothing aired, no stills (no prompt, no marks) |
| 900006 | Lantern Bay (`lantern-bay`) | Two seasons (6, 8) and three specials (season 0, served as `specials` like the API), the third out Thu 24 Dec 2026 (TMDB's next episode) |
| 900097, 900098 | No Rating, Rating Down | The Bear without an IMDb rating, and with its rating read failing (500) |

"Today" is fixed at 2026-11-12. Only Lantern Bay has specials; like the API, they sit beside `seasons` and never count in the show's totals, the show mark or the In progress / Watched lists.

### Viewers

| User | Id | Role | State |
| --- | --- | --- | --- |
| `alex` | `01STUBALEX0000000000000000` | user | The Bear: S1 and S2 watched (S2E3 without a date, S2E5 skipped), S3E1 to E4 watched (S3E3 without a date), E5 is Next up; favourited; first-tracking answered. Lantern Bay: the two aired specials only |
| `rae`, `kit` | (see `fixtures/show/store.ts`) | user | alex's twins from before specs were isolated; specs use `alex` now |
| `nina` | `01STUBNINA0000000000000000` | user | New: nothing tracked, the first-tracking prompt shows |
| `sam` | `01STUBSAM00000000000000000` | admin | The Bear: S1 and S2E1 to E3 watched; can use the admin image picker |

Sign in a headless context with `e2e/helpers/session.ts` (`await signInAs(context, 'alex')` before the first navigation), or by hand: `GET <auth stub>/__session?user=alex` returns the cookie value for `__tvseries_session` (`&format=json` gives `{ name, userId, value }`). `/__token?user=alex` returns a raw access token for curl:

```bash
A=$(curl -s "localhost:4216/__token?user=alex")
curl -H 'x-api-key: stub' -H "Authorization: Bearer $A" localhost:4116/me/library-ids
```

For a screenshot: `node page.cjs <url> <out.png> --user alex --width 390`.

### State and rules

- **Isolation (the rule for specs)**: `signInAs(context, viewer)` gives the test its own copy of the whole stub state. The session it sets carries an `ns` claim named after the running test (and its repeat/retry); the stub API loads a private instance of every fixture module for that namespace (a resolve hook in `server.ts` tags imports with `?stubns=<ns>`), so marks, skips, favourites, lists, follows, settings, imports and Plex links start from the seeds and are visible to that test only. The copy is made on the namespace's first write (any request but `GET`/`HEAD`, `/__stub/*` included); until then it reads the shared copy, which is still the seeds (see the next rule). So a fixture's `GET` must never change state: a read that did would leak into every other test. Any number of tests may sign in as `alex` in parallel and write; nothing needs resetting and there are no per-spec twin viewers. Do not reset the stub from a spec.
- Shared state is read-only. A signed-in write (`POST`/`PUT`/`PATCH`/`DELETE` with a token) that carries no namespace (a session not made by `signInAs`, `curl` with a raw token) is rejected with 409, so a spec that forgets isolation fails loudly. Signed-out requests and build-time reads use the shared copy. One deliberate exception: `/admin/*` always uses the shared copy, because an admin pick is "for everyone" and the public shell reads it without a token; `admin-images.spec.ts` therefore runs in order, alone, and calls `POST /__stub/reset` itself. Run by hand (no namespace), the stub keeps state in memory per process: `curl -X POST -H 'x-api-key: stub' localhost:4116/__stub/reset` restores the seeds (`?user=rae` one viewer only). Hand-made sessions use `GET <auth stub>/__session?user=alex&ns=<name>` to pick a private copy.
- Authorisation follows the API: `/me/*` and `/user/:id/watched*` need a Bearer token (401 without one); `/user/:id/*` writes need the token's own id (401 otherwise, as `requireIsMe` does); batch items with another `userId` are 403; `/admin/*` is admin only (401 for others, as `requireAuthAdmin` does). The stub only decodes the token (it does not verify the signature).
- `GET /dominant-color?url=` also accepts the stub's own `/img/<name>` URLs (the real route takes TMDB URLs only) and returns a dark colour derived from the name.
- `in_progress` and `watched` lists are derived from the watched marks and skips at once, by the API's rule (Finished: every aired regular episode watched or skipped, one watched at least; the real ones follow a stream a moment later).
- The `?view=progress` marks return what the API returns: the episode, or every watched episode of the season or show.
- Signed out by default: a local server without `SECRET_KEY` is always signed out.
- Signed in: `issuer.ts` is a stub OpenAuth issuer for the invented viewers in `e2e/fixtures/home/viewer.ts` (`stub-user-nina`, a member; `stub-user-sam`, a new user). `pnpm agents:serve web --stub` starts it on the auth stub port (+1100) and gives the web `AUTH_URL` and a fake local `SECRET_KEY`. Get a session with `curl 'http://localhost:<auth port>/session?user=stub-user-nina'` and set its `cookie` value as the `__tvseries_session` cookie on `localhost` (curl: `-b "__tvseries_session=<value>"`). Use a fresh browser profile: the stub server drops real sessions.
- Shared helpers go in a subfolder (`fixtures/<area>/`, not loaded as routes) and may be imported without an extension.
- `handle` may return `undefined` to pass the request to the next matching route (e.g. `/series/:id` for ids another fixture owns).
- A string body with a non-JSON `content-type` header is sent as it is (`/img/:kind/:file` placeholder SVGs, which need no key).
- Person page (`fixtures/person.ts`, data in `fixtures/person/`): `17419` Bryan Cranston (living, upcoming work, 46 self credits, family and 87 awards, watched line), `129101` Lance Reddick (deceased, work after his death, one nomination, no family), `4242001` Wren Calloway (sparse: no photo, bio, links; two guest roles), `4242003` Mara Linden (spouse, children and upcoming work: the family block at its usual count, 3 lines on desktop and 2 below lg). Any other id is a 404.
- A `handle` that returns `undefined` gives no answer: the next matching route decides (file order). Fixtures for invented people answer only for their own viewers and ids, so several streams can serve `/me` side by side.

## Profile sub-pages (PG Final: Library, History, Circle)

`fixtures/__profile-pages.ts` (data in `fixtures/user-profile/pg-*.ts`) implements the API's profile pages contract with the API's own paging logic (`queryShelf` from `@tvseri.es/utils`), so stub and API can't drift.

| Route | Stub |
| --- | --- |
| `GET /user/:id/library`, `/user/:id/library/:shelf` | every profile person; 401 signed out, 403 Hidden for a visitor, 400 for a bad query (the shared Valibot schema) |
| `GET /me/circle/people` | alex: 8 follows (leo and rumi only on the Circle routes, see `social.ts`) (juno super, tamsin very high, oskar high, bea medium, leo low, rumi very low and nothing in progress, ivo and wren no level; oskar's latest show is hidden), noor and sam to follow back; the heavy profile: 100 rows, `capped` |
| `?include=watching` on `/user/:id/followers|following` | `watching` per row; 400 above `limit=24` |
| `GET /user/:id/watched` | `start_date` + `end_date` (both, inclusive), `sort_direction`, offset cursor |
| `GET /user/:id/stats/years`, `/stats/:year/daily` | from each person's history: `months` (regular episodes), `undated` (alex 23, heavy 600, seenit 18) |

People: alex (60 shows, 2 hidden: The Chosen this year, Midsomer Murders in 2025), juno (alex visiting: new-to-alex favourites `bulk40`–`bulk44`, shared finished, shows on alex's watchlist only, both favourited), `marathonwatcher-2026` (320 shows: 48 watching + 12 hidden, 48 watchlist over three years, 210 finished, 98 favourites; titles with The/A/An, accents, digits, Japanese, Korean, Arabic, 80+ characters; a diary of 6,000 dated episodes January 2024 to August 2026 with specials, a 36-episode bulk day on 14 Jun 2025, an 8-episode binge on 6 Dec 2025, a four-show day on 2 Aug 2026, nothing in February 2025 and 300 episodes in March 2024), `seenit` (two finished shows, undated only: no Stats tab), nina (day 0), kit (0 follows either way: no Circle tab).

Writes: `POST /user/:id/list/:list`, `DELETE /user/:id/list/:list/:itemId` and `PATCH /me/series/:id/prefs` `{ paused }` update the test's Library (Undo's `createdAt` keeps the order; Hide stamps `hiddenAt`, `null` brings the show back), then pass on to the fixture that answered before. `POST /__stub/library-fail` `{ ids: number[] }` (signed in, namespaced) makes those writes answer 500 for the given show ids; `{ ids: [] }` clears it. Outage profiles: `out-<mode>-library`, `out-<mode>-librarySummary`, `out-<mode>-statsYears`; for `/me/circle/people` use `POST /__stub/outage` `{ includes: '/me/circle/people', mode }`.
