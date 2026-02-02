'use client';

import { useInsertionEffect, useRef } from 'react';

import { usePageStore } from '../Page/PageStoreProvider';

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
 * to this page's background color. We run the effect on EVERY render (no deps)
 * because:
 * 1. setProperty is cheap - just a DOM attribute update
 * 2. The component only re-renders on store change or Activity reveal
 * 3. We WANT it to run on Activity reveal to set the correct color
 *
 * Transitions are controlled by the store's enableTransitions flag:
 * - User swipes carousel → setBackground({ ..., enableTransitions: true }) → animate
 * - Back navigation restore → cached state has enableTransitions: false → no animate
 * - Initial SSR hydration → initial state has enableTransitions: false → no animate
 */
export default function BackgroundGlobalDynamic() {
  const color = usePageStore((state) => state.backgroundColor);
  const enableTransitions = usePageStore((state) => state.enableTransitions);
  const transitionStyleRef = useRef<HTMLStyleElement | null>(null);

  // Update CSS variable - useInsertionEffect fires synchronously before DOM mutations
  // No dependency array: runs on every render to handle Activity reveals
  // This is intentional and cheap (setProperty is just a DOM attribute update)
  useInsertionEffect(() => {
    document.documentElement.style.setProperty(
      '--main-background-color',
      color,
    );
  });

  // Handle transitions for carousel swipes
  useInsertionEffect(() => {
    if (enableTransitions) {
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
  }, [enableTransitions]);

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
