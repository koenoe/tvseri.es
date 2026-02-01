import { createStore, useStore } from 'zustand';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

/**
 * Background Color Store
 *
 * A singleton Zustand store that manages the global background color state.
 * This store exists outside the React tree and serves as the single source
 * of truth for the current background color.
 *
 * Architecture:
 * - Pages declare their background color via BackgroundGlobalBase
 * - BackgroundGlobalBase calls setBackgroundColor() to update this store
 * - BackgroundColorManager (in root layout) subscribes and updates the DOM
 *
 * This pattern is necessary because with PPR (Partial Prerendering via
 * cacheComponents), multiple pages can be rendered simultaneously during
 * navigation. A singleton store ensures only one background color is active.
 *
 * @see BackgroundGlobalBase - Component that pages use to declare their color
 * @see BackgroundColorManager - Singleton that applies the color to the DOM
 * @see globals.css - Defines --main-background-color CSS variable
 */

type BackgroundColorState = {
  color: string;
  setColor: (color: string) => void;
};

const backgroundColorStore = createStore<BackgroundColorState>((set) => ({
  color: DEFAULT_BACKGROUND_COLOR,
  setColor: (color) => set({ color }),
}));

/**
 * Hook for components that need to reactively read the background color.
 * Used by BackgroundColorManager to subscribe to color changes.
 */
export function useBackgroundColor() {
  return useStore(backgroundColorStore, (state) => state.color);
}

/**
 * Imperatively set the background color.
 * Used by BackgroundGlobalBase to update the store without re-rendering.
 */
export function setBackgroundColor(color: string) {
  backgroundColorStore.getState().setColor(color);
}

/**
 * Get the current background color synchronously.
 * Useful for SSR or when you need the value outside of React.
 */
export function getBackgroundColor() {
  return backgroundColorStore.getState().color;
}
