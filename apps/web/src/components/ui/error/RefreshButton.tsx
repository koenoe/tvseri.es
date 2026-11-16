'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import RetryButton from './RetryButton';

/**
 * “Try again” outside an error boundary (a page that renders `DataDownView`
 * itself): refetches the route's server data in a transition.
 */
export default function RefreshButton() {
  const router = useRouter();
  const [pending, startRefresh] = useTransition();
  const refresh = () => startRefresh(() => router.refresh());
  return <RetryButton onClick={refresh} pending={pending} />;
}
