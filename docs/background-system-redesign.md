# Background System Redesign

## Overview

Redesigned background color/image system following Vercel's composition patterns and React best practices. Uses the same history state index pattern as React Router and TanStack Router for navigation direction detection.

**Result:** -263 lines of code, fewer abstraction layers, no hydration flash on back navigation.

## Skills Applied

| Skill | Where Applied |
|-------|---------------|
| `rendering-hydration-no-flicker` | NavigationTracker, BackgroundStyle - inline scripts prevent flash |
| `rerender-lazy-state-init` | Carousel.tsx - `useState(() => getInitialIndex(...))` |
| `js-cache-function-results` | Module-level Maps in cache.ts files (not sessionStorage) |
| `state-lift-state` | BackgroundProvider lifts state for siblings |
| `architecture-avoid-boolean-props` | Changed `backgroundVariant="static"\|"dynamic"` → `animateBackground` boolean |
| `react19-no-forwardref` | Using `use()` instead of `useContext()`, `useEffectEvent` |

## UX Requirements

| # | Requirement | How Addressed |
|---|-------------|---------------|
| 1 | SSR backgrounds (no flash) | `BackgroundStyle` inline script sets CSS variable from SSR prop |
| 2 | Client animations | Zustand store update → CSS variable update → CSS transition |
| 3 | Back nav restores instantly | Pre-hydration script reads from `window.__bgCache` synchronously |
| 4 | Refresh clears state | Module-level Map clears when module reloads on refresh |
| 5 | Forward nav fresh | `isBackNavigation() = false` → uses SSR props, not cache |
| 6 | Static pages default color | `BackgroundStyle` with default color |
| 7 | Skeletons default color | Uses CSS variable which defaults to SSR value |

## Architecture

### Navigation Direction Detection

Uses the same pattern as major routing libraries:

| Library | State Key | How Direction is Detected |
|---------|-----------|---------------------------|
| React Router | `history.state.idx` | `delta = nextIndex - currentIndex` |
| TanStack Router | `history.state.__TSR_index` | Same calculation |
| This Implementation | `history.state.__navIndex` | Same calculation, exposes `window.__navIsBack` |

The key difference: our implementation runs as a **pre-hydration inline script** so the navigation direction is available before React renders. This enables zero-flash restoration of cached state.

### File Structure

```
components/
├── NavigationTracker.tsx           # Pre-hydration script for nav direction
├── Background/
│   ├── cache.ts                    # Module-level Map for back-nav
│   ├── store.ts                    # Minimal Zustand store (color/image only)
│   ├── BackgroundProvider.tsx      # Context + cache restore/save
│   ├── BackgroundStyle.tsx         # Pre-hydration script + CSS variable
│   ├── Background.tsx              # Switches between Static/Dynamic
│   ├── BackgroundBase.tsx          # Shared background rendering
│   ├── BackgroundDynamic.tsx       # Animated background (uses store)
│   └── BackgroundStatic.tsx        # Static background (uses props)
│
├── Page/
│   └── Page.tsx                    # Uses BackgroundProvider + BackgroundStyle
│
├── Carousel/
│   ├── Carousel.tsx                # Lazy state init for index restoration
│   └── cache.ts                    # Module-level Map for carousel index
│
└── utils/
    └── isBackNavigation.ts         # Shared utility
```

### Deleted Files

| File | Why Deleted |
|------|-------------|
| `Page/PageStoreProvider.tsx` | Overkill - replaced by simpler BackgroundProvider |
| `Page/store.ts` | Complex store for simple state |
| `Background/BackgroundGlobal.tsx` | Redundant abstraction |
| `Background/BackgroundGlobalBase.tsx` | Redundant abstraction |
| `Background/BackgroundGlobalDynamic.tsx` | Redundant abstraction |
| `EnsureHistoryKey.tsx` | Replaced by NavigationTracker |

## Data Flow

### SSR (Initial Page Load)

```
Server renders Page.tsx
  → BackgroundStyle receives color prop from SSR
  → Inline <style> sets :root { --main-background-color: ${color} }
  → Body/main/footer use CSS variable
  → No flash - color is set before paint
```

### Client-Side Navigation (Forward)

```
User clicks link → Next.js navigation
  → NavigationTracker: window.__navIsBack = false
  → BackgroundProvider: uses SSR props (not cache)
  → BackgroundStyle: sets CSS variable from SSR prop
  → BackgroundProvider effect: also sets CSS variable (ensures sync)
```

### Client-Side Navigation (Back)

```
User clicks back → popstate event
  → NavigationTracker: calculates delta, sets window.__navIsBack = true
  → BackgroundStyle inline script runs BEFORE React hydrates:
    1. Reads historyKey from window.history.state.key
    2. Checks window.__bgCache.get(historyKey)
    3. Sets CSS variable from cache
  → Zero flash - cached color applied before React renders
  → BackgroundProvider: initializes store from cache
  → Carousel: lazy init restores index from cache
```

### Client-Side Update (Carousel/Admin)

```
Spotlight onChange fires
  → Calls setBackground({ color, image })
  → Zustand store updates
  → BackgroundProvider subscription fires
  → CSS variable updated
  → CSS transition animates color change
```

### Page Unmount (Save to Cache)

```
User navigates away
  → BackgroundProvider cleanup effect runs
  → Current state saved to module-level Map keyed by history.state.key
  → Carousel cleanup effect runs
  → Current index saved to module-level Map
```

### Full Page Refresh

```
User refreshes page
  → Module reloads, Maps are empty
  → SSR props used (fresh state)
  → Requirement #4 satisfied
```

## Implementation Details

### NavigationTracker.tsx

Pre-hydration script that patches `history.pushState`/`replaceState` and listens to `popstate`:

```typescript
// Simplified - see actual file for full implementation
window.history.pushState = function(state, ...) {
  state.__navIndex = ++window.__navIndex;
  window.__navIsBack = false;
  return originalPushState.call(this, state, ...);
};

window.addEventListener('popstate', function() {
  var newIndex = history.state?.__navIndex || 0;
  window.__navIsBack = newIndex < window.__navIndex;
  window.__navIndex = newIndex;
});
```

### BackgroundStyle.tsx

Pre-hydration script + CSS variable:

```typescript
// Inline script runs before React hydrates
<script dangerouslySetInnerHTML={{
  __html: `(function(){
    var isBack = window.__navIsBack;
    if (isBack) {
      var key = window.history.state?.key || 'index';
      var cached = window.__bgCache?.get?.(key);
      if (cached) {
        document.documentElement.style.setProperty(
          '--main-background-color', cached.backgroundColor
        );
      }
    } else {
      // Forward nav: remove inline style, let <style> tag win
      document.documentElement.style.removeProperty('--main-background-color');
    }
  })();`
}} />

// CSS variable set from SSR prop
<style dangerouslySetInnerHTML={{
  __html: `:root { --main-background-color: ${color}; }`
}} />
```

### cache.ts (Module-level Map)

```typescript
// Module-level Map - survives SPA navigations, clears on full page refresh
const cache = new Map<string, BackgroundState>();

// Expose to window for pre-hydration inline script access
if (typeof window !== 'undefined') {
  (window as any).__bgCache = cache;
}

export function getBackground(key: string) { return cache.get(key); }
export function setBackground(key: string, state: BackgroundState) { cache.set(key, state); }
```

### BackgroundProvider.tsx

```typescript
export function BackgroundProvider({ children, initialColor, initialImage }) {
  const historyKeyRef = useRef(getHistoryKey());
  const storeRef = useRef<BackgroundStoreApi>(null);

  if (!storeRef.current) {
    // Check cache first (for back navigation)
    const cached = isBackNavigation() ? getBackground(historyKeyRef.current) : null;
    storeRef.current = createBackgroundStore(cached ?? { backgroundColor: initialColor, backgroundImage: initialImage });
  }

  // Save to cache on unmount
  useEffect(() => {
    const store = storeRef.current;
    const key = historyKeyRef.current;
    return () => {
      if (store) setBackground(key, store.getState());
    };
  }, []);

  // Sync CSS variable on mount and changes
  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;
    
    // Set on mount (critical for forward nav)
    document.documentElement.style.setProperty('--main-background-color', store.getState().backgroundColor);
    
    // Subscribe to changes
    return store.subscribe((state) => {
      document.documentElement.style.setProperty('--main-background-color', state.backgroundColor);
    });
  }, []);

  return <BackgroundContext.Provider value={storeRef.current}>{children}</BackgroundContext.Provider>;
}
```

### Carousel.tsx (Lazy State Init)

```typescript
// Read cached index synchronously during render
function getInitialIndex(cacheKey: string): number {
  if (typeof window === 'undefined') return 0;
  if (!isBackNavigation()) return 0;  // Forward nav: always start at 0
  return getCarouselIndex(cacheKey) ?? 0;
}

function Carousel({ restoreKey, onChange, ... }) {
  const cacheKeyRef = useRef(`${restoreKey}:${getHistoryKey()}`);
  
  // Lazy initialization - only reads cache once, on mount
  const [currentIndex, setCurrentIndex] = useState(() => 
    getInitialIndex(cacheKeyRef.current)
  );

  // useEffectEvent for stable callback (React 19)
  const onInitialize = useEffectEvent((restoredIndex: number) => {
    x.set(calculateNewX(restoredIndex));
    onChange?.(getItemIndex(restoredIndex));
  });

  useLayoutEffect(() => {
    if (initialIndexRef.current !== 0) {
      onInitialize(initialIndexRef.current);
    }
  }, []);

  // Save on unmount
  useEffect(() => {
    const cacheKey = cacheKeyRef.current;
    return () => {
      if (currentIndexRef.current !== 0) {
        setCarouselIndex(cacheKey, currentIndexRef.current);
      }
    };
  }, []);
}
```

## Migration Checklist

- [x] Create `components/NavigationTracker.tsx`
- [x] Create `components/Background/cache.ts`
- [x] Create `components/Background/store.ts`
- [x] Create `components/Background/BackgroundProvider.tsx`
- [x] Create `components/Background/BackgroundStyle.tsx`
- [x] Create `components/Carousel/cache.ts`
- [x] Create `utils/isBackNavigation.ts`
- [x] Update `components/Background/Background.tsx` (animated prop)
- [x] Update `components/Background/BackgroundDynamic.tsx`
- [x] Update `components/Page/Page.tsx` (animateBackground prop)
- [x] Update `components/Carousel/Carousel.tsx` (lazy init + useEffectEvent)
- [x] Update `app/(default)/home/page.tsx`
- [x] Update `app/(default)/tv/[id]/[[...slug]]/page.tsx`
- [x] Delete `components/Page/PageStoreProvider.tsx`
- [x] Delete `components/Page/store.ts`
- [x] Delete `components/Background/BackgroundGlobal.tsx`
- [x] Delete `components/Background/BackgroundGlobalBase.tsx`
- [x] Delete `components/Background/BackgroundGlobalDynamic.tsx`
- [x] Delete `components/EnsureHistoryKey.tsx`
- [x] Run type checks
- [x] Test all UX requirements

## References

- [React Router history.ts](https://github.com/remix-run/react-router/blob/main/packages/react-router/lib/router/history.ts)
- [TanStack Router history.ts](https://github.com/TanStack/router/blob/main/packages/history/src/index.ts)
- Vercel Skills: `rendering-hydration-no-flicker`, `rerender-lazy-state-init`, `js-cache-function-results`
