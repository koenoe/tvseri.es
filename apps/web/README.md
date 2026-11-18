# apps/web

The Next.js 16 front end. Setup and commands are in the root `README.md`. This file covers how pages navigate, and points to the READMEs that explain each part's non-obvious rules.

## Instant navigation

`cacheComponents: true` (`next.config.ts`) gives two things that shape much of the client code:

1. **Cached shells.** Every page's static shell is prerendered and identical for every visitor. Viewer data streams in afterwards. Anything that must look right at the first paint for *this* viewer is set by a pre-paint script (`src/lib/viewer/README.md`).
2. **Activity.** Next keeps recently visited pages mounted but hidden in React `<Activity>`, and Back shows them again as they were, instantly. A hidden page keeps its state, but its effects are cleaned up on hide and set up again on show. Hooks like `useSearchParams` hand it the URL of the page that is showing now.

Plain "on mount / on unmount" logic therefore runs at the wrong moments. The rules the code follows:

- **Do the work in setup, not cleanup.** State updates during deactivation can be dropped.
- **Record on change, not on unmount.** A hidden page has no layout, so measuring on hide reads 0.
- **Restore per history entry, in a layout effect**, with `getHistoryKey()` and `isBackNavigation()` (`src/lib/navigation/README.md`).
- **A hidden page must not react to another page's URL.**

### Workarounds, and why each exists

| Where | What it keeps | Without it |
|---|---|---|
| `src/components/background/` | the page colour per entry; a hidden page's `<style>` is switched off | wrong colour after navigating, Home loses its slide on Back |
| `src/lib/navigation/NavigationTracker.tsx` | scroll to top on a new path | the old page hides, the document shrinks, you land mid-page |
| `src/app/(site)/[id]/[[...slug]]/_lib/useShowQuery.ts` | the show page's last query while hidden | the hidden page read "no episode" and closed the episode modal, and Back reopened it small |
| `src/components/ui/row/RowScrollRestore.tsx` | each rail's scroll offset per entry, recorded on scroll | rows lose their scroll on Back |
| `src/components/remote/` | the Remote's menu re-shows closed, focus stays put | the menu was still open when you came back |
| `src/components/ui/dialog/keptOpener.ts` | what opened a dialog, from the first attach | focus returned to whatever led away instead |
| `src/components/ui/dialog/KeepValuesOnRemount.tsx` | Motion values once the entry has played | the episode modal flashed back to its tile size on Back |
| `src/app/(site)/u/[username]/(profile)/_components/shell/PageKindMarker.tsx` | the profile frame's page kind, written as a page shows | a hidden sub-page restyled the visible one |
| `src/app/(site)/settings/import/_lib/useImporter.ts` | the import runs on across a refresh or Back | an import stopped halfway |
| `src/app/(site)/_home/spotlight/useSlideshow.ts`, the profile's `usePaginated.ts`, `src/lib/search/restore.ts` | slide, loaded pages and search session per entry | Back starts them over |

The `instant()` e2e rig that guards which UI is in the static shell is described in `instant-nav.rig.md`.

## Server actions write, GET routes read

Server actions (`'use server'`) are for writes. A client read after the first paint goes through a GET route handler under `src/app/api` (`/api/me/import-status`, `/api/me/username-check`, `/api/admin/series/[id]/…`, `/api/person/[id]/self-credits` and `/awards`): a public GET can be cached at the CDN, and Next runs a page's server actions one at a time, so a read action would wait behind a write. The exception is revealing the Plex webhook URL (`settings/plex/actions.ts`): a POST is never cached or prefetched, so the secret can't land in a cache.

## Where the rules live

- `src/lib/marking/README.md`: marking episodes, dates, Undo and failures.
- `src/components/background/README.md`: page colour and backdrop.
- `src/components/header/README.md`: the header's looks.
- `src/components/ui/dialog/README.md`: dialogs, scroll lock, Safari edge strips.
- `src/lib/viewer/README.md`: pre-paint viewer hints.
- `src/lib/navigation/README.md`: history keys, Back, scroll to top.
- `e2e/README.md`: what the browser suite is for.
- API side: `apps/api/src/lib/listSync/README.md`, `apps/api/src/lib/imports/README.md`, `apps/api/src/lib/account/README.md`.
