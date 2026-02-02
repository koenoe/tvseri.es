'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import {
  setBackgroundColor,
  useBackgroundColor,
} from '@/stores/backgroundColorStore';

const CSS_VAR_NAME = '--main-background-color';

/**
 * BackgroundColorManager
 *
 * Singleton component that manages the global CSS background color variable.
 * Place this component ONCE in the root layout.
 *
 * How it works:
 * 1. Subscribes to backgroundColorStore via useBackgroundColor()
 * 2. When color changes, updates document.documentElement's CSS variable
 * 3. On pathname change, resets to default color immediately (no transition)
 *
 * Why this pattern?
 * With PPR (Partial Prerendering via cacheComponents: true), multiple Page
 * components can exist in the DOM simultaneously during navigation. If each
 * page rendered its own <style> tag setting the CSS variable, we'd get
 * conflicting styles and the old page's color would persist.
 *
 * Navigation behavior:
 * - When navigating between pages, the background resets to default immediately
 * - The new page's BackgroundGlobalBase then sets the correct color
 * - This ensures skeletons show with default background, not the previous page's
 *
 * @see backgroundColorStore - The Zustand store this component subscribes to
 * @see BackgroundGlobalBase - Component pages use to declare their color
 * @see globals.css - Defines the CSS variable and where it's used
 */
export default function BackgroundColorManager() {
  const color = useBackgroundColor();
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const isFirstRenderRef = useRef(true);

  // Reset background color on pathname change (before new page mounts)
  useLayoutEffect(() => {
    // Skip on first render - let SSR handle initial color
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // Only reset when pathname actually changes
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;

      // Disable transitions during reset to avoid flash animation
      document.documentElement.classList.remove('bg-transitions');

      // Reset to default color immediately
      setBackgroundColor(DEFAULT_BACKGROUND_COLOR);
      document.documentElement.style.setProperty(
        CSS_VAR_NAME,
        DEFAULT_BACKGROUND_COLOR,
      );
    }
  }, [pathname]);

  // Apply color changes from store
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(CSS_VAR_NAME, color);
  }, [color]);

  return null;
}
