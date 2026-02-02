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
};

export type PageActions = {
  setBackground: (
    backgroundColor: string,
    backgroundImage: string,
    options?: { enableTransitions?: boolean },
  ) => void;
};

export type PageStore = PageState & PageActions;

const defaultInitState: PageState = {
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
const cache = new Map<string, Omit<PageState, 'enableTransitions'>>();

export const createPageStore = (
  initState: PageState = defaultInitState,
  cacheKey: string,
) => {
  // Check cache for back-navigation restoration
  const cachedState = cache.get(cacheKey);
  // On restore: use cached colors but always disable transitions (no animation on back nav)
  const initialState = cachedState
    ? { ...cachedState, enableTransitions: false }
    : initState;

  const store = createStore<PageStore>((set, _get) => ({
    ...initialState,
    setBackground: (backgroundColor, backgroundImage, options = {}) => {
      // enableTransitions defaults to true when called (user interaction)
      const enableTransitions = options.enableTransitions ?? true;
      set({ backgroundColor, backgroundImage, enableTransitions });

      // Update cache (without enableTransitions - always restore without animation)
      cache.set(cacheKey, { backgroundColor, backgroundImage });
    },
  }));

  // If we used initState (not cached), save it to cache for future back-navigation
  if (!cachedState) {
    cache.set(cacheKey, {
      backgroundColor: initState.backgroundColor,
      backgroundImage: initState.backgroundImage,
    });
  }

  return store;
};
