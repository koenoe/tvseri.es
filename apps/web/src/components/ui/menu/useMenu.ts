'use client';

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { PANEL_DROP } from '@/components/motion/panelDrop';
import { moveSelection } from '@/lib/grid/moveSelection';

/** The menu's panel: a dark panel under its trigger, dropping in as it opens */
export const MENU_PANEL = `absolute top-full left-0 z-30 mt-2 flex min-w-[200px] flex-col gap-0.5 rounded-12 bg-[#0f1314] p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(255_255_255/0.1)] ${PANEL_DROP}`;

/** One row of the panel; add the text colour */
export const MENU_ITEM =
  'flex h-9 items-center gap-2.5 rounded-8 px-3 text-left text-meta font-medium outline-offset-[-2px] transition-colors';

/**
 * A button that opens a `role="menu"` panel (the Library's sort, the Move
 * menu on a service): opening focuses `focus` (a selector inside the
 * panel), arrow keys and Home/End move between the `items`, Escape or Tab
 * closes and returns to the trigger, a press outside closes. ArrowDown on
 * the trigger opens it.
 */
export function useMenu({
  focus,
  items,
}: Readonly<{ focus: string; items: string }>) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    menu.current?.querySelector<HTMLElement>(focus)?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menu.current?.contains(target) &&
        !trigger.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [focus, open]);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  const onMenuKey = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const list = [
        ...(menu.current?.querySelectorAll<HTMLElement>(items) ?? []),
      ];
      const at = list.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault();
        close();
      } else if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        const blocks = [{ columns: 1, size: list.length }];
        list[moveSelection(blocks, at, event.key, { wrap: true })]?.focus();
      }
    },
    [close, items],
  );

  const toggle = useCallback(() => setOpen((was) => !was), []);
  const onTriggerKey = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
      }
    },
    [],
  );

  return {
    close,
    menu,
    menuId,
    onMenuKey,
    onTriggerKey,
    open,
    toggle,
    trigger,
  };
}
