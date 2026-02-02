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
 * - Client: useInsertionEffect updates CSS variable when this is the active page
 * - Activity: BackgroundSync handles popstate globally (separate component)
 *
 * Why useSyncExternalStore?
 * With cacheComponents, multiple BackgroundGlobalDynamic instances exist.
 * We compare storeHistoryKey with currentHistoryKey to determine which is active.
 * Only the active page should update the CSS variable.
 *
 * Note: Activity components may not re-render on popstate. BackgroundSync handles
 * that case by reading directly from the page store cache.
 */
export default function BackgroundGlobalDynamic() {
  const color = usePageStore((state) => state.backgroundColor);
  const storeHistoryKey = usePageStore((state) => state.historyKey);
  const enableTransitions = usePageStore((state) => state.enableTransitions);
  const transitionStyleRef = useRef<HTMLStyleElement | null>(null);

  // Subscribe to history changes to trigger re-render when possible
  const currentHistoryKey = useSyncExternalStore(
    historySubscribe,
    getHistoryKey,
    () => 'index', // Server snapshot
  );

  // Determine if this is the active page
  // During hydration, currentHistoryKey might be 'index' while storeHistoryKey
  // has the real browser key - in that case we're the only mounted page
  const isHydrating =
    currentHistoryKey === 'index' && typeof window !== 'undefined';
  const isActivePage = isHydrating || storeHistoryKey === currentHistoryKey;

  // Update CSS variable when this is the active page
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
