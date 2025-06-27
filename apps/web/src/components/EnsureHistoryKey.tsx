'use client';

import { usePathname } from 'next/navigation';
import { useInsertionEffect } from 'react';

export default function EnsureHistoryKey() {
  const _pathname = usePathname();

  useInsertionEffect(() => {
    if (!window.history.state || !window.history.state.key) {
      window.history.replaceState(
        { key: Math.random().toString(32).slice(2) },
        '',
      );
    }
  }, []);

  return null;
}
