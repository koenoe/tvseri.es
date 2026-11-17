import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import {
  clearToastOverSheet,
  releaseToastSheet,
} from '@/components/ui/toast/clearToast';
import { untintEdges } from './EdgeTint';
import useSheetSwipe from './useSheetSwipe';

/**
 * The panel of a `ModalShell`: its node for the toast and the edge strips,
 * the swipe that closes it as a bottom sheet, and whether its entry has
 * played.
 */
export default function useModalPanel(open: boolean, close: () => void) {
  // The panel, for the toast: it rises above a bottom sheet while the sheet
  // is open and goes back in the commit that starts the sheet's exit.
  const panelNode = useRef<HTMLDivElement | null>(null);
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    panelNode.current = node;
    const release = clearToastOverSheet(node);
    return () => {
      panelNode.current = null;
      release?.();
    };
  }, []);
  // Phones: a swipe down closes the sheet (Vaul's feel)
  const swipe = useSheetSwipe(panelNode, close);
  useLayoutEffect(() => {
    if (!open && panelNode.current) {
      releaseToastSheet(panelNode.current);
      untintEdges(panelNode.current);
    }
  }, [open]);

  // `data-opening` until the panel's entry has played: a scroller inside
  // (LargeDialog's) stays unscrollable meanwhile, so content still settling
  // (a placeholder taller than what lands) never flashes a scroll bar. The
  // attribute is React's only at mount (the panel mounts per opening); the
  // entry's end removes it, and later renders leave the DOM alone.
  // The entry has played (per opening): from then on a remount keeps the
  // panel where it is (KeepValuesOnRemount).
  const [settled, setSettled] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSettled(false);
    }
  }
  const opened = useCallback(() => {
    panelNode.current?.removeAttribute('data-opening');
    setSettled(true);
  }, []);

  return { opened, panelNode, panelRef, settled, swipe };
}
