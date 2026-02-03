/**
 * Module-level Map cache for carousel index per history entry.
 * Survives SPA navigations, clears on full page refresh.
 *
 * @see js-cache-function-results - Module-level Map for caching
 */
const cache = new Map<string, number>();

export function getCarouselIndex(cacheKey: string): number | undefined {
  return cache.get(cacheKey);
}

export function setCarouselIndex(cacheKey: string, index: number): void {
  cache.set(cacheKey, index);
}

// Re-export shared utility for convenience
export { default as isBackNavigation } from '@/utils/isBackNavigation';
