'use client';

import { useInsertionEffect, useRef, useSyncExternalStore } from 'react';

import getHistoryKey from '@/utils/getHistoryKey';

import { usePageStore } from '../Page/PageStoreProvider';

// Subscribe to history changes via popstate
const historySubscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};

/**
 * Dynamic background that reads from PageStore and handles transitions.
 *
 * Architecture:
 * - SSR: Inline script sets CSS variable immediately (no flash)
 * - Client: useInsertionEffect updates CSS variable
 * - Activity: useSyncExternalStore triggers re-render on popstate
 *
 * Activity reveal handling (TanStack Router pattern):
 * With cacheComponents, multiple pages stay mounted. We use historyKey comparison
 * to determine which page is active. The page whose store historyKey matches the
 * current browser historyKey is the active page and should set the CSS variable.
 *
 * Hydration edge case:
 * During first client render, useSyncExternalStore may return 'index' (server snapshot)
 * while the store has the browser key. We detect this by checking if currentHistoryKey
 * is 'index' on client - if so, we're in hydration and should update the CSS variable
 * (since there's only one page mounted during initial hydration).
 *
 * Transitions are controlled by enableTransitions flag:
 * - Carousel swipe → enableTransitions: true → animate
 * - Back nav → enableTransitions: false → no animate
 * - Initial render → enableTransitions: false → no animate
 */
export default function BackgroundGlobalDynamic() {
  const color = usePageStore((state) => state.backgroundColor);
  const storeHistoryKey = usePageStore((state) => state.historyKey);
  const enableTransitions = usePageStore((state) => state.enableTransitions);
  const transitionStyleRef = useRef<HTMLStyleElement | null>(null);

  // Subscribe to history changes to trigger re-render on Activity reveal.
  const currentHistoryKey = useSyncExternalStore(
    historySubscribe,
    getHistoryKey,
    () => 'index', // Server snapshot
  );

  // Determine if this is the active page.
  // During hydration, currentHistoryKey might be 'index' (server snapshot) while
  // storeHistoryKey has the real browser key. In this case, we're the only page
  // mounted, so we should be active.
  const isHydrating =
    currentHistoryKey === 'index' && typeof window !== 'undefined';
  const isActivePage = isHydrating || storeHistoryKey === currentHistoryKey;

  // Update CSS variable - only when this is the active page
  useInsertionEffect(() => {
    if (isActivePage) {
      document.documentElement.style.setProperty(
        '--main-background-color',
        color,
      );
    }
  });

  // Handle transitions for carousel swipes - only for active page
  useInsertionEffect(() => {
    if (isActivePage && enableTransitions) {
      const style = document.createElement('style');
      style.textContent = `
        body,
        main,
        main + div,
        footer {
          transition-property: background-color;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 500ms;
        }
      `;
      document.head.appendChild(style);
      transitionStyleRef.current = style;

      const cleanup = setTimeout(() => {
        if (transitionStyleRef.current) {
          transitionStyleRef.current.remove();
          transitionStyleRef.current = null;
        }
      }, 600);

      return () => {
        clearTimeout(cleanup);
        if (transitionStyleRef.current) {
          transitionStyleRef.current.remove();
          transitionStyleRef.current = null;
        }
      };
    }
  }, [isActivePage, enableTransitions]);

  // Inline script for SSR - ensures correct color before hydration
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous execution
      dangerouslySetInnerHTML={{
        __html: `(function(){document.documentElement.style.setProperty('--main-background-color','${color}')})()`,
      }}
    />
  );
}
