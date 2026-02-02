import { createStore } from 'zustand';

import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_IMAGE,
} from '@/constants';

/**
 * Page State Interface
 *
 * Following state-context-interface pattern: defines a generic interface
 * that any provider can implement. UI components consume this interface,
 * not the implementation details.
 */
export type PageState = {
  backgroundColor: string;
  backgroundImage: string;
  enableTransitions: boolean;
  historyKey: string;
};

export type PageActions = {
  setBackground: (
    backgroundColor: string,
    backgroundImage: string,
    options?: { enableTransitions?: boolean },
  ) => void;
  setHistoryKey: (historyKey: string) => void;
};

export type PageStore = PageState & PageActions;

const defaultInitState: Omit<PageState, 'historyKey'> = {
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  backgroundImage: DEFAULT_BACKGROUND_IMAGE,
  enableTransitions: false,
};

/**
 * In-memory cache for page background state, keyed by history entry.
 *
 * Following js-cache-function-results pattern: module-level Map provides
 * O(1) lookups for back-navigation restoration.
 *
 * Why in-memory (not sessionStorage)?
 * - Refresh: Map clears → SSR color is used (correct behavior)
 * - Back navigation: Same historyKey → cache hit → instant restore
 * - Forward navigation: New historyKey → cache miss → SSR color
 */
const cache = new Map<
  string,
  Omit<PageState, 'enableTransitions' | 'historyKey'>
>();

/**
 * Creates a page store for background state management.
 *
 * @param initState - Initial state from SSR props
 * @param historyKey - The history key this store belongs to
 * @param shouldRestoreFromCache - Whether to restore from cache (true for back nav, false for forward)
 */
export const createPageStore = (
  initState: Omit<PageState, 'historyKey'> = defaultInitState,
  historyKey: string,
  shouldRestoreFromCache: boolean = false,
) => {
  const cacheKey = `page:${historyKey}`;

  // Only restore from cache on back navigation
  const cachedState = shouldRestoreFromCache ? cache.get(cacheKey) : undefined;

  // On restore: use cached colors but always disable transitions (no animation on back nav)
  // On forward: use SSR props with transitions disabled (no animation on initial render)
  const initialState: PageState = cachedState
    ? { ...cachedState, enableTransitions: false, historyKey }
    : { ...initState, historyKey };

  const store = createStore<PageStore>((set) => ({
    ...initialState,
    setBackground: (backgroundColor, backgroundImage, options = {}) => {
      // enableTransitions defaults to true when called (user interaction)
      const enableTransitions = options.enableTransitions ?? true;
      set({ backgroundColor, backgroundImage, enableTransitions });

      // Always update cache for future back-navigation
      cache.set(cacheKey, { backgroundColor, backgroundImage });
    },
    setHistoryKey: (newHistoryKey) => {
      set({ historyKey: newHistoryKey });
    },
  }));

  // Always save initial state to cache for future back-navigation
  if (!cachedState) {
    cache.set(cacheKey, {
      backgroundColor: initState.backgroundColor,
      backgroundImage: initState.backgroundImage,
    });
  }

  return store;
};
