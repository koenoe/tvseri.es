'use client';

import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CircleButtonSize } from '@/components/ui/button/buttonStyles';
import { returnFocus } from '@/components/ui/dialog/focusReturn';
import type { IconSize } from '@/components/ui/icon/types';
import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import type { RemotePlacement } from './place';
import { RemoteContext } from './RemoteContext';
import RemotePanel, { type OpenedBy } from './RemotePanel';
import RemotePopover from './RemotePopover';
import RemoteSheet from './RemoteSheet';
import RemoteTrigger, { OPEN_KEYS, remoteLabels } from './RemoteTrigger';
import useRemoteMount, { type RemoteMount } from './useRemoteMount';

type RemoteProps = RemoteMount &
  Readonly<{
    /** The keys: rows of `RemoteKey`s (the big key first). */
    children: ReactNode;
    className?: string;
    /** A tile's own colour for the phone sheet's dim; the page colour otherwise. */
    ink?: string;
    /** After it closes (the Library's Watchlist drops a removed tile then, not under the pointer). */
    onClose?: () => void;
    placement: RemotePlacement;
    /** Names the menu and its ⋯ (`remoteLabels`) */
    seriesName: string;
    /** The ⋯ glyph: 20px by default. */
    triggerIconSize?: IconSize;
    triggerSize: CircleButtonSize;
  }>;

/**
 * The ⋯ and its Remote: a popover by the ⋯ on desktop, a bottom sheet on
 * phones. Enter, Space or ↓ on the ⋯ opens it on the big key; a click opens
 * it on the menu (letters work at once). Escape closes and returns focus to
 * the ⋯; Tab and a click outside close.
 */
export default function Remote({
  children,
  className,
  focusOnMount,
  ink,
  onClose,
  openOnMount,
  placement,
  seriesName,
  triggerIconSize = 20,
  triggerSize,
}: RemoteProps) {
  const { menu: label, trigger: triggerLabel } = remoteLabels(seriesName);
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
  // the sheet below 768px
  const phone = useMediaQuery(PHONE);
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

  const layout = phone ? 'sheet' : 'popover';
  const context = useMemo(
    () => ({ close, layout, openId }) as const,
    [close, layout, openId],
  );
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
  const panel = openedBy ? (
    <RemotePanel id={menuId} label={label} openedBy={openedBy}>
      {children}
    </RemotePanel>
  ) : null;

  const layer = phone ? (
    <RemoteSheet label={label} onOpenChange={sheetChange} open={isOpen}>
      {panel}
    </RemoteSheet>
  ) : (
    <RemotePopover
      onDismiss={dismiss}
      open={isOpen}
      placement={placement}
      triggerRef={triggerRef}
    >
      {panel}
    </RemotePopover>
  );

  return (
    <RemoteContext value={context}>
      <RemoteTrigger
        after={layer}
        aria-busy={busy}
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        className={className}
        iconSize={triggerIconSize}
        ink={ink}
        label={triggerLabel}
        onClick={toggle}
        onKeyDown={openFromKeyboard}
        ref={triggerRef}
        size={triggerSize}
      />
    </RemoteContext>
  );
}
