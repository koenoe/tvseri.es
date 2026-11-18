'use client';

import useRouteRefresh from '@/lib/navigation/useRouteRefresh';

import RetryButton from './RetryButton';

/**
 * “Try again” outside an error boundary (a page that renders `DataDownView`
 * itself): refetches the route's server data in a transition.
 */
export default function RefreshButton() {
  const [pending, refresh] = useRouteRefresh();
  return <RetryButton onClick={refresh} pending={pending} />;
}
