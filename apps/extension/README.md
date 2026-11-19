# tvseri.es extension (Chrome, MV3)

Connects streaming services (Netflix, BBC iPlayer, Prime Video) to a
tvseri.es account. The extension hands the service's browser session to
tvseri.es once, against a short-lived code the site minted; sync then runs
on the server. Nothing is sent before the viewer presses Continue on the
service's consent screen in the popup, except the code itself (see
Consent). The extension never syncs by itself; it keeps only the last link
result per site, for the popup and the toolbar icon.

## Load it (development)

1. `pnpm dev`. Before `next dev` it writes `apps/extension/dev-build/`
   (gitignored): this folder with its site moved to `http://localhost:3000`
   (`writeDevExtension` in `apps/web/src/lib/extension/extensionZip.ts`).
2. `chrome://extensions` → Developer mode → **Load unpacked** →
   `apps/extension/dev-build`. Not this folder, and not the zip /extension
   offers: both talk to www.tvseri.es only. The dev copy is named
   "tvseri.es (localhost)" and its consent screen says "Sends to
   localhost:3000".
3. On the site: Settings → Connected apps → **Connect Netflix**. The card
   shows a four-digit code, hands it to the extension, and the popup opens
   on the consent screen with the code filled in. Press Continue. Or open
   the popup, pick the service and type the code.

The dev copy is only rewritten when `pnpm dev` (or
`node apps/web/scripts/extension-zip.ts --dev`) runs. After changing the
extension, run it again and press reload on `chrome://extensions`.

## One site per build

Every build talks to one site: `SITE_ORIGIN` in `origins.js`. The source,
the zip /extension offers and the store package use
`https://www.tvseri.es`. The dev copy rewrites that line to
`http://localhost:3000`, swaps the manifest's www patterns for localhost's
and changes the name; the `key` stays, so the extension id is the same.
There is no runtime choice of site.

## Talking to the site (`externally_connectable`)

Only the build's site may message the extension
(`chrome.runtime.sendMessage(EXTENSION_ID, message)`); preview stages
(`pr-N`) can't. The worker also checks `sender.origin` and posts only to
its own site, never to one a message names. A malformed message, or one
from any other site, gets no reply.

| Message | Reply |
| --- | --- |
| `{ type: 'ping' }` | `{ installed: true, services, version }`: the service ids this version can connect, so the site offers only those |
| `{ type: 'link', service, code }` | `{ ok: false, reason: 'pending-consent' }`, at once |
| `{ type: 'cancel', code }` | `{ ok: true }`: drops the waiting request with that code (the card's Cancel) |
| `{ type: 'request-state', code }` | `{ state }`: `waiting`, `declined` (Cancel in the popup) or `gone` (linked, expired or replaced) |

The popup talks to the worker; only the extension's own pages, with a
four-digit code and a known service, get a reply:

| Message | Reply |
| --- | --- |
| `{ type: 'check', code, service }` | `{ ok: true, username }` or `{ ok: false, reason }` (`bad-code`, `rate-limited`, `unavailable`). POSTs only the code to `/api/connections/<service>/link/check` |
| `{ type: 'link', code, service }` | `{ ok: true, profile }` or `{ ok: false, reason }` |

A `link` from the site sends nothing. The worker keeps it as the pending
request in `chrome.storage.session` (never on disk) and calls
`chrome.action.openPopup()` without a user gesture, which Chrome allows
since 127 but hasn't been tried in a real install yet. A newer request
replaces an older one, and one older than five minutes (the code's life)
is dropped. If the popup can't open, the request waits and the popup
shows it first when next opened.

The reply comes at once because the worker may be stopped while the popup
waits, and the site gives up after 20 seconds. The card shows "Confirm in
the extension" and polls its connection status for the outcome; why a
link failed shows in the popup only. Builds from before the consent screen
replied with the link's own result; the site still accepts that.

## Consent

One screen per service, however the code came in: "Connect <service>?",
the sentence from `disclosure()` in `consent.js`, the four code slots,
Cancel and Continue. From the site the slots arrive filled and focus goes
to the title, so the sentence is read first and a stray Enter doesn't
agree. The screen shows on every link, agreed before or not: it carries
the code to compare with the card.

A full code is checked first, and the line over Continue says "Links to
**<username>** on tvseri.es". Continue turns on only then, so a code
someone else sent (to have this history land in their account) never
links unseen. The check never spends the code, but a wrong code counts
against the link's hourly limit.

Continue records `consent[service] = { version, agreedAt }` in
`chrome.storage.local`. Bump `CONSENT_VERSION` with any change to the
sentence.

## Development ID

`manifest.json` carries a public `key`, so the unpacked extension always
has the ID `midgpplaihphccejepaigffjjlbcjkmc`. Keep the private key out of
git. The Chrome Web Store refuses uploads that contain `key`: strip it
from the store package. Once the store item exists, make the dev key the
store item's public key so both IDs match.

## Permissions

| Permission | Why |
| --- | --- |
| `cookies` + `https://netflix.com/*`, `https://*.netflix.com/*` | Read the Netflix session to send it once. No content scripts. |
| `cookies` + `https://bbc.co.uk/*`, `https://*.bbc.co.uk/*` | Read the BBC account session to send it once. No content scripts. |
| `cookies` + `https://primevideo.com/*`, `https://*.primevideo.com/*` | Read the Prime Video session to send it once. No content scripts. |
| `storage` | The last result per site, the agreed consent wording per service, and the site's waiting request (session storage). |
| `https://www.tvseri.es/*` | POST the link and its check (`/api/connections/<service>/link` and `/link/check`). |
| `http://localhost:3000/*` (dev copy only) | Replaces the line above in `dev-build/`'s manifest. |

No tabs, no browsing history, no `<all_urls>`.

## Results

The link POST gives up after 25 seconds (`unavailable`). Results and
consent records are written under a Web Lock shared by the popup and the
worker, so two writes never drop each other's change. The popup has copy
for `bad-code`, `rate-limited`, `signed-out`, `test-read-failed` and
`unavailable`; any other reason shows "Couldn't connect. Try again."

## The toolbar icon

The icon lights up when this browser has linked a service, read from the
stored results. It isn't live status: the extension has no tvseri.es
session to ask, so disconnecting on the site doesn't unlight it. "Use
another code" in the popup clears it.

The manifest's `icons` (extensions page and store) use the `active` set,
the brand mark. Only the toolbar icon switches between `idle` and
`active`.

## Layout

| File | What it is |
| --- | --- |
| `manifest.json` | MV3, the permissions above |
| `background.js` | The service worker: pending requests, the link POST, the toolbar icon |
| `consent.js` | The consent sentence, its version and the pending request's life |
| `origins.js` | The build's one site, shared by the popup and the worker |
| `services.js` | The services: names, cookie domains, logos |
| `popup.html/js/css` | The service list, the consent screen and the results |
| `fonts/` | Inter (OFL), the site's typeface |
| `icons/` | Toolbar icons `idle` (grey dot) and `active` (cyan dot), the logo and the service logos (simple-icons, CC0) |

The look follows the sign-in pages (`apps/auth/src/ui/css`). The icons are
the site's `icon.svg` with the dot recoloured; `logo.svg` is drawn from
`LOGO_PATH` in `@tvseri.es/constants`. There is no build step, so
regenerate them if either changes (`rsvg-convert -w 128 icons/active.svg`).

The route contract lives in `packages/schemas` (`connections`). The API
endpoints are `POST /me/connections/link-code` (signed in) and the public,
code-bound `POST /connections/<service>/link` and
`POST /connections/<service>/link/check`, reached through the web's route
handlers.

## Adding a service

An entry in `SERVICES` (`services.js`), its host permissions in the
manifest, and a link route on the site. Results are stored per service, so
each links on its own.
