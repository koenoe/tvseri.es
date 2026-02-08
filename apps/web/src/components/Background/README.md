# Background System

The background system manages full-page background colors and images across SPA navigations, with zero-flash back-navigation and Activity (cacheComponents) compatibility.

## Architecture

```
Page.tsx (server component)
├── BackgroundStyle         SSR: inline <style> + pre-hydration script
│   └── BackgroundStyleTag  Activity-proof <style> via media toggle
├── BackgroundProvider      Client: Zustand store + cache + CSS var sync
│   └── Background
│       ├── BackgroundDynamic  AnimatePresence crossfade (carousel pages)
│       │   └── BackgroundBase  Shared image + gradient overlays
│       └── BackgroundStatic   Plain div (non-carousel pages)
│           └── BackgroundBase
└── children (page content)
```

## Data Flow

### Forward navigation (fresh page load)

1. **SSR**: `Page` renders `BackgroundStyle` with the route's background color
2. `BackgroundStyle` emits a `<style>` tag setting `--main-background-color` CSS variable
3. `BackgroundProvider` initializes a Zustand store from server props
4. `useLayoutEffect` sets the CSS variable on `<html>` and subscribes to store changes
5. On carousel pages, `Spotlight` calls `store.setBackground()` on slide change, which updates the CSS variable via the subscription

### Back navigation (instant restore)

1. **Pre-hydration** (before React): `BackgroundStyle`'s inline script checks `window.__navIsBack`, reads cached color from `window.__bgCache`, and sets the CSS variable immediately — no flash
2. **Hydration**: `BackgroundProvider` initializes the store from server props (safe defaults)
3. **`useLayoutEffect`**: Detects back-nav via `isBackNavigation()`, restores full state from cache (color + image), syncs the CSS variable

### Activity hide/show (cacheComponents)

When Next.js hides a route via Activity (`display: none`), effects clean up:

1. `BackgroundProvider` saves store state to `cache.ts` Map, removes CSS variable, unsubscribes
2. `BackgroundStyleTag` sets `media="not all"` to disable the `<style>` tag globally

When Activity re-shows the route, effects re-run:

1. `BackgroundStyleTag` sets `media=""` to re-enable styles
2. `BackgroundProvider` detects re-show via `hasMountedRef`, restores from cache (back-nav) or resets to server props (forward-nav)
3. `MotionGlobalConfig.instantAnimations` suppresses the AnimatePresence crossfade during the re-show state sync

## File Responsibilities

| File | Type | Purpose |
|------|------|---------|
| `Background.tsx` | Server | Routes to Dynamic or Static variant |
| `BackgroundProvider.tsx` | Client | Zustand store, cache save/restore, CSS variable sync |
| `BackgroundDynamic.tsx` | Client | AnimatePresence crossfade on image/color change |
| `BackgroundStatic.tsx` | Server | Non-animated wrapper |
| `BackgroundBase.tsx` | Client | Shared rendering: responsive image + gradient overlays |
| `BackgroundImage.tsx` | Server | Responsive `<img>` with `preload()` and srcSet |
| `BackgroundStyle.tsx` | Server | Pre-hydration script + Activity-proof `<style>` tag |
| `BackgroundStyleTag.tsx` | Client | `<style>` with `media` toggle for Activity compatibility |
| `store.ts` | Shared | Zustand store type and factory |
| `cache.ts` | Client | Module-level `Map<historyKey, BackgroundState>`, exposed as `window.__bgCache` |

## External Dependencies

| File | Purpose |
|------|---------|
| `NavigationTracker.tsx` | Pre-hydration script: patches `pushState`/`replaceState`, tracks nav direction via `window.__navIsBack` and `window.__navIndex` |
| `Page/Page.tsx` | Composes `BackgroundStyle` + `BackgroundProvider` + `Background` |
| `Spotlight/Spotlight.tsx` | Calls `store.setBackground()` on carousel slide change |
| `utils/isBackNavigation.ts` | Reads `window.__navIsBack` |
| `utils/getHistoryKey.ts` | Reads `window.history.state.key` |

## Window Globals

The background (and carousel) system relies on three `window` properties set up by pre-hydration inline scripts. These exist because inline `<script>` tags in SSR HTML cannot import ES modules — they need synchronous access to shared state before React hydrates.

| Global | Set by | Read by | Type | Purpose |
|--------|--------|---------|------|---------|
| `window.__navIsBack` | `NavigationTracker` | `BackgroundStyle` (script), `isBackNavigation()` | `boolean` | `true` after a `popstate` where the new history index < previous. Reset to `false` on `pushState`. Determines whether to restore cached state or reset to server defaults. |
| `window.__navIndex` | `NavigationTracker` | `NavigationTracker` (internal) | `number` | Monotonically increasing counter. `pushState` increments it; `popstate` compares against it to compute direction. Not read outside NavigationTracker. |
| `window.__bgCache` | `Background/cache.ts` | `BackgroundStyle` (script) | `Map<string, BackgroundState>` | Module-level `Map` exposed to `window` so the pre-hydration script can read cached background colors before React hydrates. Only the script reads from `window`; all other access goes through the `cache.ts` module API. |

### `history.state.key`

Each history entry gets a unique random key (e.g. `"k7f2x9m3q1"`) assigned by NavigationTracker's `pushState` patch. This key is used as the cache key for both `__bgCache` and the carousel index cache. It distinguishes entries that share the same URL — e.g. navigating `/tv/123` -> `/tv/456` -> back -> `/tv/123` creates two distinct `/tv/123` entries with different keys and independent cached state.

Read via `getHistoryKey()` — must be called in `useLayoutEffect`, not during render, because `history.state` is external mutable state.

### Why inline scripts?

The core problem: on back-navigation, React hydration takes time. Without intervention, the user would see the server-rendered background color flash before the cached color is restored. The inline scripts solve this:

1. **NavigationTracker** (in `layout.tsx`, runs first): patches `pushState`/`replaceState`/`popstate` to track navigation direction. Inspired by [React Router's `history.state.idx`](https://github.com/remix-run/react-router/blob/main/packages/react-router/lib/router/history.ts) and [TanStack Router's `__TSR_index`](https://github.com/TanStack/router/blob/main/packages/history/src/index.ts).

2. **BackgroundStyle** (per-page, runs second): checks `__navIsBack`, reads the cached color from `__bgCache`, and sets the `--main-background-color` CSS variable on `<html>` — all before React hydrates a single component. Zero flash.

## Key Patterns

- **Pre-hydration inline scripts** prevent flash on back-nav by setting CSS variables before React hydrates (`rendering-hydration-no-flicker`)
- **Activity-proof `<style>`** toggles `media` attribute in `useLayoutEffect` to disable styles when hidden ([Shu Ding's pattern](https://shud.in/thoughts/build-bulletproof-react-components#make-it-activity-proof))
- **History reads in `useLayoutEffect`, not render** — `history.state` and `window.__navIsBack` are external mutable state that may not reflect the current navigation during render
- **`historyKey` captured at setup, closed over in cleanup** — cleanup fires when Activity hides, but `history.state` already reflects the new route
- **Module-level `Map` cache** survives SPA navigations, clears on full refresh (`js-cache-function-results`)
- **`MotionGlobalConfig.instantAnimations`** suppresses Motion crossfade during Activity re-show state sync, reset after 2 animation frames

## Cache Lifecycle

```
Navigate to /tv/123     → BackgroundProvider mounts, store = server props
Swipe carousel          → Spotlight calls setBackground(), store updates
Navigate to /tv/456     → Activity hides /tv/123:
                            cleanup saves {color, image} to cache[historyKey]
                            BackgroundStyleTag sets media="not all"
Press back              → Activity re-shows /tv/123:
                            setup reads isBackNavigation() = true
                            restores from cache[historyKey]
                            CSS variable set immediately
Full page refresh       → Module-level Map is gone, starts fresh from server
```
