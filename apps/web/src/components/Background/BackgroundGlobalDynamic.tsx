'use client';

import { useEffect, useInsertionEffect, useRef } from 'react';

import { usePageStore } from '../Page/PageStoreProvider';

/**
 * Dynamic background that reads from PageStore and handles transitions.
 *
 * Architecture:
 * - SSR: Parent renders BackgroundGlobalBase with inline script for immediate color
 * - Client: This component takes over, updating the CSS variable via useInsertionEffect
 * - Transitions: Added temporarily during carousel swipes, then removed
 *
 * Activity visibility detection:
 * With cacheComponents, multiple pages stay mounted but hidden. We detect visibility
 * by checking if our closest <main> element has offsetParent (visible elements have it,
 * hidden Activity elements don't). Only the visible page updates the CSS variable.
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
  const scriptRef = useRef<HTMLScriptElement>(null);

  // Check if this component's page is visible (Activity not hidden)
  const isPageVisible = () => {
    const main = scriptRef.current?.closest('main');
    // If no main found, assume visible (SSR or not yet mounted)
    if (!main) return true;
    // offsetParent is null for hidden elements (display:none, visibility:hidden, or hidden ancestor)
    return main.offsetParent !== null;
  };

  // Update CSS variable - only when this page is visible
  useInsertionEffect(() => {
    if (isPageVisible()) {
      document.documentElement.style.setProperty(
        '--main-background-color',
        color,
      );
    }
  });

  // Handle Activity reveal on popstate (back/forward navigation)
  // When Activity reveals, we need to sync the background color
  useEffect(() => {
    const syncBackground = () => {
      // Use RAF to let Activity visibility update before we check
      requestAnimationFrame(() => {
        // Check visibility inline to avoid stale closure
        const main = scriptRef.current?.closest('main');
        const isVisible = main ? main.offsetParent !== null : true;
        if (isVisible) {
          document.documentElement.style.setProperty(
            '--main-background-color',
            color,
          );
        }
      });
    };

    window.addEventListener('popstate', syncBackground);
    return () => window.removeEventListener('popstate', syncBackground);
  }, [color]);

  // Handle transitions for carousel swipes - only for visible page
  useInsertionEffect(() => {
    // Check visibility inline to avoid stale closure
    const main = scriptRef.current?.closest('main');
    const isVisible = main ? main.offsetParent !== null : true;

    if (isVisible && enableTransitions) {
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
  // The ref is used to find our parent <main> element for visibility detection
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous SSR execution
      dangerouslySetInnerHTML={{
        __html: `(function(){document.documentElement.style.setProperty('--main-background-color','${color}')})()`,
      }}
      ref={scriptRef}
    />
  );
}
