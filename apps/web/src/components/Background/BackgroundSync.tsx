'use client';

import { useEffect } from 'react';

import getHistoryKey from '@/utils/getHistoryKey';

import { getCachedBackgroundColor } from '../Page/store';

/**
 * Global background color sync for back/forward navigation.
 *
 * Problem: With cacheComponents, Activity components don't re-render on popstate.
 * The BackgroundGlobalDynamic inside a hidden Activity won't update the CSS variable.
 *
 * Solution: A single global listener that reads from the page store cache and
 * syncs the CSS variable. This runs outside of React's Activity optimization.
 *
 * This component should be mounted once in the root layout.
 */
export default function BackgroundSync() {
  useEffect(() => {
    const handlePopState = () => {
      // RAF to ensure history.state is updated
      requestAnimationFrame(() => {
        const historyKey = getHistoryKey();
        const cachedColor = getCachedBackgroundColor(historyKey);

        if (cachedColor) {
          document.documentElement.style.setProperty(
            '--main-background-color',
            cachedColor,
          );
        }
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return null;
}
