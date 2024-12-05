'use client';

import { useInsertionEffect } from 'react';

import { usePathname } from 'next/navigation';

export default function EnsureHistoryKey() {
  const pathname = usePathname();

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
