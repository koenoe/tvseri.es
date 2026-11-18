'use client';

import { createContext, use } from 'react';

export type RemoteLayout = 'popover' | 'sheet';

type RemoteContextValue = Readonly<{
  /**
   * Closes the Remote. `restoreFocus` puts focus back on the ⋯ when it was
   * still inside the Remote (Escape, a key that closes it). With `fromOpen`
   * it only closes when that open (`openId`) is still the current one: a
   * late answer must not close a Remote reopened since.
   */
  close: (restoreFocus: boolean, fromOpen?: number) => void;
  /** Desktop popover (letters, hint) or the phone sheet (bigger keys, no letters). */
  layout: RemoteLayout;
  /** Which open this is: changes every time the ⋯ opens the Remote. */
  openId: number;
}>;

export const RemoteContext = createContext<RemoteContextValue | null>(null);

export function useRemote(): RemoteContextValue {
  const value = use(RemoteContext);
  if (!value) {
    throw new Error('Remote keys render inside a Remote');
  }
  return value;
}
