'use client';

import { frame, MotionGlobalConfig } from 'motion/react';
import {
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useLayoutEffect,
  useRef,
} from 'react';
import { useStore } from 'zustand';

import {
  getBackground,
  getHistoryKey,
  isBackNavigation,
  setBackground,
} from './cache';
import { type BackgroundStore, createBackgroundStore } from './store';

type BackgroundStoreApi = ReturnType<typeof createBackgroundStore>;

const BackgroundContext = createContext<BackgroundStoreApi | null>(null);

/**
 * Context for BackgroundStyleTag to register its <style> element ref.
 * This allows BackgroundProvider to toggle the style tag's media attribute
 * in the SAME useLayoutEffect that sets the CSS variable, eliminating
 * the parent-child effect ordering window that caused stale backgrounds
 * during Activity re-show.
 */
const StyleTagRefContext = createContext<RefObject<HTMLStyleElement | null>>({
  current: null,
});

export { StyleTagRefContext };

type BackgroundProviderProps = Readonly<{
  children: ReactNode;
  initialColor: string;
  initialImage: string;
}>;

/**
 * BackgroundProvider manages background color state for SPA navigation.
 * Uses module-level Map cache for back-nav restoration.
 *
 * Under Activity (cacheComponents), each unique route param value gets its
 * own Activity instance (keyed by e.g. "id|123|d"). When the Activity hides,
 * useLayoutEffect cleanup fires — we save the store state to cache. When it
 * shows again (back-nav), setup fires — we restore the CSS variable.
 *
 * History state (history.state.key, __navIsBack) is NOT read during render
 * because it's external mutable state that may not yet reflect the current
 * navigation at render time. All history reads happen in useLayoutEffect.
 *
 * The pre-hydration script in BackgroundStyle handles the visual side for
 * back-nav (sets CSS var from __bgCache before React hydrates), so there's
 * no flash even though we defer cache restoration to useLayoutEffect.
 *
 * This provider also owns the <style> tag media toggle (via StyleTagRefContext)
 * to ensure the CSS variable and style tag activation happen atomically in
 * the same synchronous effect — preventing the stale-background bug caused
 * by Activity's bottom-up effect ordering (child setup before parent setup).
 *
 * @see state-lift-state - Move state into provider for sibling access
 * @see js-cache-function-results - Module-level Map for caching
 */
export function BackgroundProvider({
  children,
  initialColor,
  initialImage,
}: BackgroundProviderProps) {
  const storeRef = useRef<BackgroundStoreApi>(null);
  const hasMountedRef = useRef(false);
  const styleTagRef = useRef<HTMLStyleElement>(null);

  // Always initialize from server props. Cache restoration happens in
  // useLayoutEffect where history.state is reliable.
  if (!storeRef.current) {
    storeRef.current = createBackgroundStore({
      backgroundColor: initialColor,
      backgroundImage: initialImage,
    });
  }

  // On mount / Activity show:
  // 1. Check if this is a back-nav and restore from cache if so
  // 2. Capture historyKey for cache save on cleanup
  // 3. Sync CSS variable and enable <style> tag atomically
  // 4. Subscribe to store changes
  //
  // On unmount / Activity hide:
  // 1. Save current store state to cache
  // 2. Disable <style> tag and remove CSS variable atomically
  useLayoutEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    const historyKey = getHistoryKey();
    const isReshow = hasMountedRef.current;
    hasMountedRef.current = true;
    const isBack = isBackNavigation();

    // Restore from cache on back navigation, reset to server props on forward.
    // Back-nav: user expects to see the page as they left it (e.g. carousel position).
    // Forward-nav (including Activity re-show): reset to the server-provided defaults
    // so the page starts fresh (e.g. carousel resets to item 1).
    //
    // On Activity re-show, the store change may trigger a re-render in
    // BackgroundDynamic (via Zustand), causing AnimatePresence to crossfade.
    // We suppress this by setting Motion's global instantAnimations flag:
    // any animations starting while the flag is true get duration 0.
    // The flag is cleared after two animation frames (same pattern as
    // Motion's own useInstantTransition). We only do this on re-show,
    // not on first mount, to avoid suppressing intentional entrance animations.
    if (isReshow) {
      MotionGlobalConfig.instantAnimations = true;
    }

    if (isBack) {
      const cached = getBackground(historyKey);
      if (cached) {
        store.setState(cached);
      }
    } else {
      store.setState({
        backgroundColor: initialColor,
        backgroundImage: initialImage,
      });
    }

    if (isReshow) {
      frame.postRender(() =>
        frame.postRender(() => {
          MotionGlobalConfig.instantAnimations = false;
        }),
      );
    }

    // Atomically enable <style> tag AND set CSS variable.
    // Both happen in the same synchronous effect to prevent any window
    // where the style tag is active but the CSS var hasn't been set yet.
    const styleTag = styleTagRef.current;
    if (styleTag) {
      styleTag.media = '';
    }

    const currentState = store.getState();
    document.documentElement.style.setProperty(
      '--main-background-color',
      currentState.backgroundColor,
    );

    // Subscribe to future store changes (carousel swipes, etc.)
    const unsubscribe = store.subscribe((state) => {
      document.documentElement.style.setProperty(
        '--main-background-color',
        state.backgroundColor,
      );
    });

    return () => {
      // Save to cache before hiding — future back-nav can restore
      const state = store.getState();
      setBackground(historyKey, {
        backgroundColor: state.backgroundColor,
        backgroundImage: state.backgroundImage,
      });

      unsubscribe();

      // Atomically disable <style> tag AND remove CSS variable.
      document.documentElement.style.removeProperty('--main-background-color');
      if (styleTag) {
        styleTag.media = 'not all';
      }
    };
  }, [initialColor, initialImage]);

  return (
    <BackgroundContext.Provider value={storeRef.current}>
      <StyleTagRefContext value={styleTagRef}>{children}</StyleTagRefContext>
    </BackgroundContext.Provider>
  );
}

export function useBackground<T>(selector: (store: BackgroundStore) => T): T {
  const context = use(BackgroundContext);

  if (!context) {
    throw new Error('useBackground must be used within <BackgroundProvider />');
  }

  return useStore(context, selector);
}
