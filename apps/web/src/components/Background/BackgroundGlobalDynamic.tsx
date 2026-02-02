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
 * - SSR: Parent renders BackgroundGlobalBase with inline script for immediate color
 * - Client: This component takes over, updating the CSS variable via useInsertionEffect
 * - Transitions: Added temporarily during carousel swipes, then removed
 *
 * Activity reveal handling:
 * With cacheComponents, multiple pages stay mounted but hidden. When a page
 * reveals (becomes active again), we need to update the global CSS variable
 * to this page's background color.
 *
 * The challenge: when Activity reveals, React doesn't automatically re-render
 * children that haven't changed. We use useSyncExternalStore to subscribe to
 * history changes (popstate), which triggers a re-render when navigating back/forward.
 * This ensures the useInsertionEffect runs and sets the correct CSS variable.
 *
 * Transitions are controlled by the store's enableTransitions flag:
 * - User swipes carousel → setBackground({ ..., enableTransitions: true }) → animate
 * - Back navigation restore → cached state has enableTransitions: false → no animate
 * - Initial SSR hydration → initial state has enableTransitions: false → no animate
 */
export default function BackgroundGlobalDynamic() {
  const color = usePageStore((state) => state.backgroundColor);
  const storeHistoryKey = usePageStore((state) => state.historyKey);
  const enableTransitions = usePageStore((state) => state.enableTransitions);
  const transitionStyleRef = useRef<HTMLStyleElement | null>(null);

  // Subscribe to history changes to trigger re-render on Activity reveal.
  // When user navigates back/forward, popstate fires, this returns a new value,
  // and the component re-renders - allowing useInsertionEffect to set the CSS var.
  const currentHistoryKey = useSyncExternalStore(
    historySubscribe,
    getHistoryKey,
    () => 'index', // Server snapshot
  );

  // Only update CSS variable if this store is for the currently active page.
  // With Activity caching, multiple BackgroundGlobalDynamic components are mounted.
  // Only the one matching the current history entry should update the global CSS var.
  const isActivePage = storeHistoryKey === currentHistoryKey;

  // Debug logging
  console.log('[BG] render:', {
    color,
    currentHistoryKey,
    isActivePage,
    storeHistoryKey,
  });

  // Update CSS variable - useInsertionEffect fires synchronously before DOM mutations
  // Only runs when this is the active page, preventing hidden Activity pages from
  // overwriting the visible page's background color.
  useInsertionEffect(() => {
    console.log('[BG] useInsertionEffect:', { color, isActivePage });
    if (isActivePage) {
      console.log('[BG] Setting CSS var to:', color);
      document.documentElement.style.setProperty(
        '--main-background-color',
        color,
      );
    }
  });

  // Handle transitions for carousel swipes - only for active page
  useInsertionEffect(() => {
    if (isActivePage && enableTransitions) {
      // Add transition styles temporarily for smooth animation
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

      // Remove transition styles after animation completes
      const cleanup = setTimeout(() => {
        if (transitionStyleRef.current) {
          transitionStyleRef.current.remove();
          transitionStyleRef.current = null;
        }
      }, 600); // Slightly longer than transition duration

      return () => {
        clearTimeout(cleanup);
        if (transitionStyleRef.current) {
          transitionStyleRef.current.remove();
          transitionStyleRef.current = null;
        }
      };
    }
  }, [isActivePage, enableTransitions]);

  // Render inline script for SSR - ensures correct color before hydration
  // After hydration, useInsertionEffect takes over for updates
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous execution
      dangerouslySetInnerHTML={{
        __html: `(function(){document.documentElement.style.setProperty('--main-background-color','${color}')})()`,
      }}
    />
  );
}
