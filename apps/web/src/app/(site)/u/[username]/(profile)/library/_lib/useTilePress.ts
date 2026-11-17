import { type MouseEvent, type PointerEvent, useCallback, useRef } from 'react';

import { LONG_PRESS_MS } from '@/lib/longPress';

/**
 * An owner's long press on a touch screen starts select mode; the click that
 * ends the press neither follows the link nor toggles the tile again, and
 * the context menu stays shut.
 */
export function useTilePress(
  id: number,
  owner: boolean,
  longPress: (id: number) => void,
  pick: (id: number, range: boolean) => void,
) {
  const pressed = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedLong = useRef(false);

  const cancelPress = () => {
    if (pressed.current) {
      clearTimeout(pressed.current);
      pressed.current = null;
    }
  };
  const startPress = (event: PointerEvent) => {
    if (!owner || event.pointerType !== 'touch') {
      return;
    }
    pressedLong.current = false;
    cancelPress();
    pressed.current = setTimeout(() => {
      pressedLong.current = true;
      longPress(id);
    }, LONG_PRESS_MS);
  };
  const toggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (pressedLong.current) {
        pressedLong.current = false;
        return;
      }
      pick(id, event.shiftKey);
    },
    [pick, id],
  );
  const follow = useCallback((event: MouseEvent) => {
    if (pressedLong.current) {
      event.preventDefault();
      pressedLong.current = false;
    }
  }, []);
  const touch = {
    onContextMenu: (event: { preventDefault: () => void }) => {
      if (owner && pressedLong.current) {
        event.preventDefault();
      }
    },
    onPointerCancel: cancelPress,
    onPointerDown: startPress,
    onPointerLeave: cancelPress,
    onPointerUp: cancelPress,
  };
  return { follow, toggle, touch };
}
