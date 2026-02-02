'use client';

import {
  useEffect,
  useInsertionEffect,
  useRef,
  useSyncExternalStore,
} from 'react';

import getHistoryKey from '@/utils/getHistoryKey';

import { usePageStore } from '../Page/PageStoreProvider';

// Module-level registry of all mounted BackgroundGlobalDynamic instances
// Maps historyKey → color, updated on every render
const colorRegistry = new Map<string, string>();

// Subscribe to history changes via popstate
const historySubscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};

// Global popstate handler that syncs CSS variable from registry
// This runs even when Activity components don't re-render
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    // RAF to let Activity visibility update
    requestAnimationFrame(() => {
      const currentKey = getHistoryKey();
      const color = colorRegistry.get(currentKey);
      if (color) {
        document.documentElement.style.setProperty(
          '--main-background-color',
          color,
        );
      }
    });
  });
}

/**
 * Dynamic background that reads from PageStore and handles transitions.
 *
 * Architecture:
 * - SSR: Inline script sets CSS variable immediately (no flash)
 * - Client: useInsertionEffect updates CSS variable
 * - Activity: Global popstate handler syncs from registry when Activity reveals
 *
 * Activity handling (TanStack Router pattern):
 * With cacheComponents, components in hidden Activity don't re-render on external
 * store changes. We maintain a module-level registry (historyKey → color) that gets
 * updated on every render. A global popstate handler reads from this registry to
 * sync the CSS variable when navigating back/forward.
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
    () => 'index',
  );

  // Register this page's color in the module-level registry
  // This happens on every render, keeping the registry up-to-date
  colorRegistry.set(storeHistoryKey, color);

  // Cleanup: remove from registry on unmount
  useEffect(() => {
    return () => {
      colorRegistry.delete(storeHistoryKey);
    };
  }, [storeHistoryKey]);

  // Determine if this is the active page
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
