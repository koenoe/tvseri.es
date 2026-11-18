'use client';

import { type ReactNode, useMemo } from 'react';
import type { CircleButtonSize } from '@/components/ui/button/buttonStyles';
import type { IconSize } from '@/components/ui/icon/types';
import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import type { RemotePlacement } from './place';
import { RemoteContext } from './RemoteContext';
import RemotePanel from './RemotePanel';
import RemotePopover from './RemotePopover';
import RemoteSheet from './RemoteSheet';
import RemoteTrigger, { remoteLabels } from './RemoteTrigger';
import type { RemoteMount } from './useRemoteMount';
import useRemoteOpen from './useRemoteOpen';

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
  const {
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
  } = useRemoteOpen({ focusOnMount, onClose, openOnMount });
  // the sheet below 768px
  const phone = useMediaQuery(PHONE);

  const layout = phone ? 'sheet' : 'popover';
  const context = useMemo(
    () => ({ close, layout, openId }) as const,
    [close, layout, openId],
  );
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
