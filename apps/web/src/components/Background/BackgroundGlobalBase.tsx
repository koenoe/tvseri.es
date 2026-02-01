'use client';

import { useLayoutEffect } from 'react';

import { setBackgroundColor } from '@/stores/backgroundColorStore';

/**
 * BackgroundGlobalBase
 *
 * Registers a page's background color with the global store.
 * This component renders nothing - it only updates the backgroundColorStore.
 *
 * Usage:
 * ```tsx
 * <BackgroundGlobalBase color="#867508" enableTransitions />
 * ```
 *
 * How it works:
 * 1. On mount/update, calls setBackgroundColor() to update the store
 * 2. BackgroundColorManager (in root layout) subscribes and updates the DOM
 * 3. CSS variable --main-background-color changes, updating all backgrounds
 *
 * Why not render a <style> tag directly?
 * With PPR (Partial Prerendering), multiple pages can be rendered simultaneously
 * during client-side navigation. If each page rendered its own <style> tag
 * setting the CSS variable, we'd get conflicting styles. The singleton store
 * pattern ensures only one color is active at a time.
 *
 * @param color - The background color (hex, rgb, etc.)
 * @param enableTransitions - When true, adds 'bg-transitions' class to enable
 *                            smooth color transitions (defined in globals.css)
 *
 * @see backgroundColorStore - Where the color is stored
 * @see BackgroundColorManager - Applies the color to the DOM
 */
export default function BackgroundGlobalBase({
  color,
  enableTransitions = false,
}: Readonly<{
  color: string;
  enableTransitions?: boolean;
}>) {
  useLayoutEffect(() => {
    // Update the global store - BackgroundColorManager handles the DOM update
    setBackgroundColor(color);

    // Optionally enable smooth background transitions
    if (enableTransitions) {
      document.documentElement.classList.add('bg-transitions');
    }

    return () => {
      // Clean up transition class when component unmounts
      if (enableTransitions) {
        document.documentElement.classList.remove('bg-transitions');
      }
    };
  }, [color, enableTransitions]);

  return null;
}
