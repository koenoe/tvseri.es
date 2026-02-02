# Navigation State Restoration for cacheComponents

## Problem

With `cacheComponents: true`, Next.js uses React's `<Activity>` component to preserve component state during navigation. Components hide/reveal instead of unmount/remount, breaking the current cache restoration logic which relies on `useState` initializers only running on mount.

## Solution

Adopt the TanStack Router pattern: track a navigation index in `history.state` to detect back vs forward navigation, then use this to decide whether to restore cached state.

## UX Requirements

| # | Requirement | How Addressed |
|---|-------------|---------------|
| 1 | SSR backgrounds (no flash) | `BackgroundGlobalBase` inline script - unchanged |
| 2 | Client animations | `setBackground()` with `enableTransitions: true` - unchanged |
| 3 | Back nav restores instantly | `wasBackNavigation() = true` → restore from cache with `enableTransitions: false` |
| 4 | Refresh clears state | In-memory `Map` clears on refresh → SSR props used |
| 5 | Forward nav fresh | `wasBackNavigation() = false` → SSR props, not cache |
| 6 | Static pages default color | `BackgroundGlobalBase` with default - unchanged |
| 7 | Skeletons default color | `SkeletonPage` uses default - unchanged |

## Navigation Scenarios

| From | To | Direction | Expected Background |
|------|-----|-----------|---------------------|
| Home (carousel at index 3, blue) | Series A (red) | Forward | Red (SSR) |
| Series A (red) | Home | Back | Blue (cached, no animation) |
| Series A (red) | Series B (green) | Forward | Green (SSR) |
| Series B (green) | Series A | Back | Red (cached, no animation) |
| Series A (red) | Discover (default) | Forward | Default (SSR) |
| Discover (default) | Series A | Back | Red (cached, no animation) |
| Home (blue) | Discover | Forward | Default (SSR) |
| Discover | Home | Back | Blue (cached, no animation) |
| Any page | Refresh | N/A | SSR value |
| Home (index 3, blue) | Series A → Home (new push) | Forward | SSR (index 0), NOT cached |

## Files Changed

### Created
- `src/components/NavigationTracker.tsx` - Inline script for navigation tracking
- `src/utils/navigationState.ts` - Utilities to read navigation state

### Updated
- `src/app/layout.tsx` - Add NavigationTracker, remove EnsureHistoryKey
- `src/components/Page/store.ts` - Add shouldRestoreFromCache parameter
- `src/components/Page/PageStoreProvider.tsx` - Detect Activity reveal, check wasBackNavigation
- `src/hooks/createUseRestorableState.ts` - Only restore on back navigation
- `src/components/List/List.tsx` - In-memory cache, only restore on back navigation

### Deleted
- `src/components/EnsureHistoryKey.tsx` - Merged into NavigationTracker

## Technical Approach

### Navigation Tracking (TanStack Pattern)

1. Store `__navIndex` in `history.state` (0, 1, 2, 3...)
2. Patch `pushState` to increment index on forward navigation
3. Listen to `popstate` - compare indices to detect direction
4. Set `window.__navIsBack = (newIndex < currentIndex)`

### Activity Reveal Detection

Track `historyKeyRef` in components. When historyKey changes but component didn't remount (Activity reveal), reset state based on navigation direction.

```tsx
if (historyKeyRef.current !== null && historyKeyRef.current !== currentHistoryKey) {
  storeRef.current = null; // Reset, will be recreated
}
historyKeyRef.current = currentHistoryKey;
```

### Cache Strategy

- **Key**: `historyKey` (unique per history entry)
- **Direction**: `wasBackNavigation()` determines restore vs fresh
- **Storage**: In-memory `Map` (clears on refresh = correct UX)
