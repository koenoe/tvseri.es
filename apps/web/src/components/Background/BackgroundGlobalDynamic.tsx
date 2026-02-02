'use client';

import { usePageStore } from '../Page/PageStoreProvider';
import BackgroundGlobalBase from './BackgroundGlobalBase';

/**
 * Dynamic background that reads from PageStore.
 *
 * Transitions are controlled by the store's enableTransitions flag:
 * - User swipes carousel → setBackground({ ..., enableTransitions: true }) → animate
 * - Back navigation restore → cached state has enableTransitions: false → no animate
 * - Initial SSR hydration → initial state has enableTransitions: false → no animate
 */
export default function BackgroundGlobalDynamic() {
  const color = usePageStore((state) => state.backgroundColor);
  const enableTransitions = usePageStore((state) => state.enableTransitions);

  return (
    <BackgroundGlobalBase color={color} enableTransitions={enableTransitions} />
  );
}
