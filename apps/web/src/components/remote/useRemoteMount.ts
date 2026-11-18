import {
  type RefObject,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { OpenedBy } from './RemotePanel';

/**
 * A Remote swapped in for a press on its stand-in ⋯ (`LazyRemote`): it
 * takes the focus the stand-in had, and opens as that press would have.
 */
export type RemoteMount = Readonly<{
  /** Focus the ⋯ as it mounts (the stand-in had the focus) */
  focusOnMount?: boolean;
  /** Open as it mounts, as this press would; the ⋯ reads busy until then */
  openOnMount?: OpenedBy;
}>;

/**
 * What a swapped-in Remote does as it mounts (`RemoteMount`). Returns
 * whether it is still opening: its ⋯ reads busy until then.
 */
export default function useRemoteMount(
  { focusOnMount = false, openOnMount }: RemoteMount,
  triggerRef: RefObject<HTMLButtonElement | null>,
  openAs: (by: OpenedBy) => void,
): boolean {
  // Swapped in for a press (`RemoteMount`). The open waits until the mount
  // has settled: StrictMode re-runs a new Remote's effects (as a re-shown
  // Activity would), and Remote closes its menu on that re-run, so
  // an open sent from the commit itself would be undone and need a second
  // press. The microtask runs after that re-run, in the same flush.
  const [opening, setOpening] = useState(openOnMount !== undefined);
  const pendingOpen = useRef(openOnMount);
  const openPending = useEffectEvent((by: OpenedBy) => {
    setOpening(false);
    openAs(by);
  });
  const pendingFocus = useRef(focusOnMount);
  // Before paint, once: a re-shown Activity leaves the focus where it is
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      pendingFocus.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [triggerRef]);
  useEffect(() => {
    const by = pendingOpen.current;
    if (!by) {
      return;
    }
    pendingOpen.current = undefined;
    queueMicrotask(() => openPending(by));
  }, []);

  return opening;
}
