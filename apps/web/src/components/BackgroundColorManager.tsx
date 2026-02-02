'use client';

import { useLayoutEffect } from 'react';

import { useBackgroundColor } from '@/stores/backgroundColorStore';

const CSS_VAR_NAME = '--main-background-color';

/**
 * BackgroundColorManager
 *
 * Singleton component that manages the global CSS background color variable.
 * Place this component ONCE in the root layout, wrapped in Suspense.
 *
 * How it works:
 * 1. Subscribes to backgroundColorStore via useBackgroundColor()
 * 2. When color changes, updates document.documentElement's CSS variable
 * 3. Elements using var(--main-background-color) automatically update
 *
 * Why this pattern?
 * With PPR (Partial Prerendering via cacheComponents: true), multiple Page
 * components can exist in the DOM simultaneously during navigation. If each
 * page rendered its own <style> tag setting the CSS variable, we'd get
 * conflicting styles and the old page's color would persist.
 *
 * Instead:
 * - Pages use BackgroundGlobalBase to "declare" their color to the store
 * - This single component is the only one that touches the DOM
 * - Last page to mount wins (correct behavior for navigation)
 *
 * @see backgroundColorStore - The Zustand store this component subscribes to
 * @see BackgroundGlobalBase - Component pages use to declare their color
 * @see globals.css - Defines the CSS variable and where it's used
 */
export default function BackgroundColorManager() {
  const color = useBackgroundColor();

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(CSS_VAR_NAME, color);
  }, [color]);

  return null;
}
