# Navigation tracking

Next keeps visited pages mounted but hidden (React Activity, see `apps/web/README.md`). Several features need to know which history entry they are on and whether the user came back to it. `NavigationTracker.tsx` gives them that.

## History keys and Back

`NAVIGATION_TRACKER_SCRIPT` is inlined in the root layout and runs before hydration and before Next patches `history`:

- Every history entry gets a random `key` and an index (`__navIndex`) in `history.state`. `pushState` makes a new key and index; `replaceState` keeps both.
- On `popstate` it compares indices: a lower index is Back. It sets `window.__navIsBack`, read synchronously by `isBackNavigation()`.
- `getHistoryKey()` returns the current entry's key. Two visits to the same URL are two entries with two keys, so per-entry state never mixes.

Used to restore state on Back, from module-level maps keyed by history key:

- the page colour and backdrop (`components/background/cache.ts`);
- Home's spotlight slide (`app/(site)/_home/spotlight/useSlideshow.ts`);
- rail scroll positions (`components/ui/row/RowScrollRestore.tsx`);
- paged profile lists (`app/(site)/u/[username]/(profile)/_lib/pagination/usePaginated.ts`);
- the search overlay's query and results (`lib/search/restore.ts`).

Read the key and direction in a layout effect, not during render: `history.state` is external, mutable state.

## Every new page opens at the top

A push or replace that changes the pathname scrolls the window to 0, in a microtask after the commit that wrote the URL. That is after Next's own scroll and before paint.

**Why:** Next only scrolls when the new page's top is off screen. When the old page hides, the document shrinks and the browser clamps the offset, so a page under a tall layout (Settings, the profile) often counts as visible and you landed mid-page.

**Left alone:** Back and Forward (the browser restores the offset), query-only changes (`?episode=`, `?season=`, `?history`), and URLs with a hash (Next scrolls to the anchor).

## Also here

- `PrefetchProvider.tsx`: one `router.prefetch` for every tile. Calling `useRouter()` in each tile re-rendered dozens of tiles on every navigation.
- `isPlainClick.ts`: a primary click with no modifier keys, the only kind a custom link handler may take over.
- `useRouteRefresh.ts`: `router.refresh()` in a transition, with a pending flag.
