'use client';

import { lazy, Suspense } from 'react';

import { useDialogs } from '../../_lib/dialogs';
import useOpenedOnce from '../../_lib/useOpenedOnce';

const loadPicker = () => import('./DatePicker');
const DatePicker = lazy(loadPicker);

/** Starts loading the picker's code (the sheet does when it opens). */
export function preloadPicker() {
  void loadPicker();
}

/**
 * The date picker for `useDialogs`' picker request. Its code (and react-day-picker) loads when it
 * first opens, then stays mounted so closing plays the exit.
 */
export default function PickerHost() {
  const request = useDialogs((state) => state.picker);
  const opened = useOpenedOnce(request !== null);
  if (!opened) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <DatePicker request={request} />
    </Suspense>
  );
}
