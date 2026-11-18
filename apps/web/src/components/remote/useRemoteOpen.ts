'use client';

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { returnFocus } from '@/components/ui/dialog/focusReturn';

import type { OpenedBy } from './RemotePanel';
import { OPEN_KEYS } from './RemoteTrigger';
import useRemoteMount, { type RemoteMount } from './useRemoteMount';

/**
 * The Remote's open state: how it opened (keyboard or pointer, for the
 * focus ring on the way back), each opening's id, closing with focus back
 * on the ⋯, and `onClose` once it has closed.
 */
export default function useRemoteOpen({
  focusOnMount,
  onClose,
  openOnMount,
}: RemoteMount & Readonly<{ onClose?: () => void }>) {
  const [openedBy, setOpenedBy] = useState<OpenedBy | null>(null);
  const [openId, setOpenId] = useState(0);
  const currentOpen = useRef(0);
  // Focus goes back to the ⋯ with its ring only when the keyboard opened it
  const ring = useRef(false);
  const openAs = (by: OpenedBy) => {
    ring.current = by === 'keyboard';
    currentOpen.current += 1;
    setOpenId(currentOpen.current);
    setOpenedBy(by);
  };
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const mounted = useRef(false);

  // A route's Activity re-shows with the menu
  // closed (setup, not cleanup: updates during deactivation can be dropped).
  useLayoutEffect(() => {
    if (mounted.current) {
      setOpenedBy(null);
    }
    mounted.current = true;
  }, []);

  const opening = useRemoteMount(
    { focusOnMount, openOnMount },
    triggerRef,
    openAs,
  );

  const close = useCallback(
    (restoreFocus: boolean, fromOpen?: number) => {
      if (fromOpen !== undefined && fromOpen !== currentOpen.current) {
        return;
      }
      setOpenedBy(null);
      const active = document.activeElement;
      const inside =
        !active ||
        active === document.body ||
        Boolean(document.getElementById(menuId)?.contains(active));
      if (restoreFocus && inside) {
        returnFocus(triggerRef.current, ring.current);
      }
    },
    [menuId],
  );
  const dismiss = useCallback(() => setOpenedBy(null), []);
  const sheetChange = useCallback(
    (next: boolean) => {
      if (!next) {
        dismiss();
      }
    },
    [dismiss],
  );
  const toggle = () => (openedBy ? setOpenedBy(null) : openAs('pointer'));
  const openFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (OPEN_KEYS.has(event.key)) {
      event.preventDefault();
      openAs('keyboard');
    }
  };

  const isOpen = openedBy !== null;
  // absent unless opening: the ⋯ stays identical otherwise
  const busy = opening || undefined;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      onClose?.();
    }
    wasOpen.current = isOpen;
  }, [isOpen, onClose]);
  return {
    busy,
    close,
    dismiss,
    isOpen,
    menuId,
    openedBy,
    openFromKeyboard,
    openId,
    sheetChange,
    toggle,
    triggerRef,
  };
}
