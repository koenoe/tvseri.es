# Viewer hints (pre-paint)

Pages are cached (Cache Components), so the server HTML is the same for every visitor. Viewer-specific data streams in later. Without help, the first paint shows the wrong placeholder and the layout jumps when the data arrives. The pre-paint script makes the cached shell fit this viewer before anything is painted.

## What runs, and when

- `viewerHintsScript.ts`: an inline script in the root layout's `<head>`, run once per document before the first paint. It reads the display cookie once (`readCookieUser`) and `localStorage` once, then sets:
  - **signed in**: a stylesheet that shows signed-in-only space, and on a profile the owner's or a visitor's placeholders;
  - `applyHtmlHints` (`htmlHints.ts`) on `<html>`:
    - `data-home`: Home's new or member layout;
    - `data-show-prompt`: whether the "Seen it before?" prompt applies;
    - `data-stats-year`: whether the year is finished, so it has a Share row;
    - `data-plex`: the Plex settings card's last known shape;
  - `applyRegionHint` (`lib/region/regionHint.ts`): Discover's "Streaming in …" line;
  - `--viewer-handle`: the header draws the username before hydration;
  - `data-flat-glass` on devices with 4 cores or fewer: the menu's glass drops its blur, which is expensive on weak hardware. Apple's WebKit is excluded because it under-reports cores, so every iPhone would lose its glass.
- `RouteHints.tsx`: runs the same `applyHtmlHints` in a layout effect on every client navigation, since the script runs once per document.
- The other inline script, for history keys, is `lib/navigation/NavigationTracker.tsx`.

## Rules

- **Cosmetic only.** The cookie and storage are readable and writable by the user. Nothing is ever authorised or hidden for privacy on a hint; the server decides that.
- **Self-contained.** The script embeds the functions with `.toString()`, so `applyHtmlHints`, `applyRegionHint` and friends must not reference anything outside themselves.
- **Small.** Every HTML response carries it; its size is pinned in `viewerHintsScript.test.ts`.
- **Never throws past a rule.** Every storage access can throw (private mode, blocked storage); the stylesheet rules run first in their own `try`, so a failing hint can't leave signed-in space hidden.
- `<html>` carries `suppressHydrationWarning` because React would report these attributes as a mismatch. That covers one element deep only.

## The viewer's day

`useLocalDay` (`useLocalDay.ts`, `dayClock.ts`) gives the viewer's local `YYYY-MM-DD`, or null on the server and during hydration, because a cached page can't know the viewer's day. It re-checks once a minute, so a tab left open past midnight moves on.
