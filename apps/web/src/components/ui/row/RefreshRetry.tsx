'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { TryAgain } from '@/components/ui/failed/FailedCard';
import type { TryAgainLook } from '@/components/ui/failed/failedLooks';

import { ROW_TRY_AGAIN } from './rowFailedLook';

/**
 * Try again for a section of a cached page whose read was unavailable: it
 * refreshes the route. A failed read is kept for a short while (the
 * `unavailable` cache life), so a press inside that time, or the first one
 * after it, can come back with the same failure while the page is made
 * again; the button shows the retry until the refresh has answered.
 */
export default function RefreshRetry({
  look = ROW_TRY_AGAIN,
}: Readonly<{
  /** the button's look where it isn't a row's card (a profile block) */
  look?: TryAgainLook;
}>) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const retry = () => startRetry(() => router.refresh());
  return <TryAgain look={look} onClick={retry} pending={retrying} />;
}
