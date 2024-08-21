import { useSyncExternalStore } from 'react';

export default function useMatchMedia(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', callback);
      return () => mediaQueryList.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false, // Default value for SSR
  );
}
