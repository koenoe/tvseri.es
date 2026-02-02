'use client';

import { useLayoutEffect } from 'react';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import { setBackgroundColor } from '@/stores/backgroundColorStore';

/**
 * BackgroundReset
 *
 * Resets the global background color to the default value.
 * Used in loading/skeleton states to ensure skeletons display with
 * the neutral default background instead of the previous page's color.
 *
 * Why this is needed:
 * With PPR (Partial Prerendering via cacheComponents: true), when navigating
 * from Page A to Page B, the skeleton for Page B shows before Page B's
 * BackgroundGlobalBase mounts. Without this reset, the skeleton would display
 * with Page A's background color.
 *
 * Usage:
 * Include this component in SkeletonPage or any loading.tsx file:
 * ```tsx
 * <BackgroundReset />
 * ```
 *
 * @see backgroundColorStore - The store being reset
 * @see BackgroundGlobalBase - The component that sets page-specific colors
 * @see SkeletonPage - Primary consumer of this component
 */
export default function BackgroundReset() {
  useLayoutEffect(() => {
    // Reset to default immediately when skeleton mounts
    setBackgroundColor(DEFAULT_BACKGROUND_COLOR);
  }, []);

  return null;
}
