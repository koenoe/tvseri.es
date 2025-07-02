'use client';

import { usePathname } from 'next/navigation';
import { useInsertionEffect } from 'react';

export default function EnsureHistoryKey() {
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: yeah right
  useInsertionEffect(() => {
    if (!window.history.state || !window.history.state.key) {
      window.history.replaceState(
        { key: Math.random().toString(32).slice(2) },
        '',
      );
    }
  }, [pathname]);

  return null;
}
