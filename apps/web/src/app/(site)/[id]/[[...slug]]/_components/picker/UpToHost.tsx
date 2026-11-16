'use client';

import { lazy, Suspense } from 'react';

import { useDialogs } from '../../_lib/dialogs';
import useOpenedOnce from '../../_lib/useOpenedOnce';

const loadUpTo = () => import('./UpToDialog');
const UpToDialog = lazy(loadUpTo);

/** Starts loading "I'm up to…" (the sheet does when it opens). */
export function preloadUpTo() {
  void loadUpTo();
}

/**
 * "I'm up to…" (`.ut`) for `useDialogs`' up-to request: from the
 * season line (Enter), the sheet's Up to here and the first-tracking prompt.
 * Loads when it first opens, then stays mounted so closing plays the exit.
 */
export default function UpToHost() {
  const request = useDialogs((state) => state.upTo);
  const opened = useOpenedOnce(request !== null);
  if (!opened) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <UpToDialog request={request} />
    </Suspense>
  );
}
