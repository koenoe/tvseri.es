'use client';

import { frame, MotionGlobalConfig } from 'motion/react';
import {
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useStore } from 'zustand';

import getHistoryKey from '@/lib/navigation/getHistoryKey';
import isBackNavigation from '@/lib/navigation/isBackNavigation';

import { restoreBackground, saveBackground } from './cache';
import { type BackgroundStore, createBackgroundStore } from './store';

type BackgroundStoreApi = ReturnType<typeof createBackgroundStore>;

const BackgroundContext = createContext<BackgroundStoreApi | null>(null);

/**
 * BackgroundStyleTag registers its <style> element here, so the provider can
 * toggle its `media` in the SAME layout effect that sets the CSS variable.
 * Activity runs child effects before parent effects; doing both in one place
 * closes the window that showed a stale colour on re-show.
 */
export const StyleTagRefContext = createContext<
  RefObject<HTMLStyleElement | null>
>({ current: null });

const setCssVariable = (color: string) =>
  document.documentElement.style.setProperty('--main-background-color', color);

/**
 * Keeps `--main-background-color` in sync across client navigations.
 *
 * Under Activity (Cache Components) a page that is navigated away from stays
 * mounted but hidden: its layout effects clean up (the state is saved for its
 * history entry, the CSS variable removed, its <style> disabled) and set up
 * again when it is shown. On Back, the entry's saved state is restored before
 * paint, so the colour is right on the first frame. On a document load the
 * server <style> paints the colour; nothing has to run before hydration.
 *
 * History state is read in the layout effect, never during render: it is
 * external mutable state that may not reflect the navigation yet.
 *
 * @see state-lift-state - Move state into provider for sibling access
 */
export function BackgroundProvider({
  children,
  initialColor,
  initialImage,
}: Readonly<{
  children: ReactNode;
  initialColor: string;
  initialImage: string;
}>) {
  const [store] = useState(() =>
    createBackgroundStore({
      backgroundColor: initialColor,
      backgroundImage: initialImage,
    }),
  );
  const hasMountedRef = useRef(false);
  const styleTagRef = useRef<HTMLStyleElement>(null);

  useLayoutEffect(() => {
    // Captured at setup: when cleanup runs (Activity hides this page), history
    // already points at the next entry.
    const historyKey = getHistoryKey();
    const isReshow = hasMountedRef.current;
    hasMountedRef.current = true;

    // A re-show syncs the store, which would crossfade BackgroundDynamic. Any
    // animation that starts while this flag is set gets duration 0; it's
    // cleared after two frames (Motion's own useInstantTransition pattern).
    // Not on first mount, so entrance animations still play.
    if (isReshow) {
      MotionGlobalConfig.instantAnimations = true;
    }

    store.getState().setBackground(
      restoreBackground({
        historyKey,
        initial: {
          backgroundColor: initialColor,
          backgroundImage: initialImage,
        },
        isBack: isBackNavigation(),
      }),
    );

    if (isReshow) {
      frame.postRender(() =>
        frame.postRender(() => {
          MotionGlobalConfig.instantAnimations = false;
        }),
      );
    }

    // Enable the <style> and set the variable atomically.
    const styleTag = styleTagRef.current;
    if (styleTag) {
      styleTag.media = '';
    }
    setCssVariable(store.getState().backgroundColor);

    // Later changes (carousel slides, the admin picker)
    const unsubscribe = store.subscribe((state) =>
      setCssVariable(state.backgroundColor),
    );

    return () => {
      saveBackground(historyKey, store.getState());
      unsubscribe();
      document.documentElement.style.removeProperty('--main-background-color');
      if (styleTag) {
        styleTag.media = 'not all';
      }
    };
  }, [initialColor, initialImage, store]);

  return (
    <BackgroundContext value={store}>
      <StyleTagRefContext value={styleTagRef}>{children}</StyleTagRefContext>
    </BackgroundContext>
  );
}

/** Reads the page's background state; inside a `Page` only. */
export function useBackground<T>(selector: (store: BackgroundStore) => T): T {
  const store = use(BackgroundContext);

  if (!store) {
    throw new Error('useBackground must be used within <BackgroundProvider />');
  }

  return useStore(store, selector);
}
