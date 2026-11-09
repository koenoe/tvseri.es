'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => false;
const getServerSnapshot = () => true;

/**
 * An inline script that only exists in the server HTML. It runs before
 * hydration; a script React creates on the client (e.g. on a soft
 * navigation) never runs and React warns about it, so it's left out there.
 * During hydration useSyncExternalStore returns the server snapshot, so the
 * markup still matches.
 */
export default function PreHydrationScript({
  html,
}: Readonly<{
  html: string;
}>) {
  const isServerRender = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!isServerRender) {
    return null;
  }

  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous pre-hydration execution
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
