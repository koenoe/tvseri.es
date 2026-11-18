'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

/**
 * Reads the route's server data again (`router.refresh()`) in a transition:
 * `pending` is true until the refreshed page has answered. `refresh` keeps
 * its identity across renders (the router's does), so an effect can depend
 * on it.
 */
export default function useRouteRefresh(): readonly [
  pending: boolean,
  refresh: () => void,
] {
  const router = useRouter();
  const [pending, startRefresh] = useTransition();
  const refresh = useCallback(
    () => startRefresh(() => router.refresh()),
    [router],
  );
  return [pending, refresh];
}
