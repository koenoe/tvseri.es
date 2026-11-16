'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useState,
} from 'react';

import getMainBackgroundColor from '@/components/background/getMainBackgroundColor';
import cn from '@/lib/cn';
import { remoteInk } from '@/lib/remote/ink';

import { moveInGrid, shortcutTarget } from './grid';
import { type RemoteLayout, useRemote } from './RemoteContext';

const keysOf = (menu: HTMLElement) =>
  Array.from(menu.querySelectorAll<HTMLElement>('[data-remote-key]'));

/** Each row's key count: the keys of one `RemoteRow`, or a key on its own. */
function rowsOf(keys: ReadonlyArray<HTMLElement>): number[] {
  const rows: number[] = [];
  let previous: Element | null = null;
  for (const key of keys) {
    const row = key.closest('[data-remote-row]') ?? key;
    if (row === previous) {
      rows[rows.length - 1]! += 1;
    } else {
      rows.push(1);
      previous = row;
    }
  }
  return rows;
}

export type OpenedBy = 'keyboard' | 'pointer';

const PANEL: Readonly<Record<RemoteLayout, string>> = {
  popover: 'remote-surface w-84 rounded-16 p-2',
  sheet: 'remote-surface bg-transparent shadow-none!',
};

/**
 * The menu (`role="menu"`): its keys, the arrows between them, the letters,
 * Escape and Tab. Keys are found in the DOM (`data-remote-key`, rows by
 * `data-remote-row`), so extra rows need no registration.
 */
export default function RemotePanel({
  children,
  id,
  label,
  openedBy,
}: Readonly<{
  children: ReactNode;
  id: string;
  label: string;
  openedBy: OpenedBy;
}>) {
  const { close, ink, layout } = useRemote();
  // The tile's colour or the page colour, darkened (lib/remote/ink): it tints
  // the fills only, the text keeps its fixed colours; read once, when the
  // panel opens.
  const [inkStyle] = useState(
    () =>
      ({
        '--rk-ink': remoteInk(ink ?? getMainBackgroundColor()),
      }) as CSSProperties,
  );

  // Keyboard: focus the big key; pointer: the menu, so letters work at once.
  // After the commit: a sheet's showModal() would move focus again.
  const focusOnOpen = useCallback(
    (menu: HTMLDivElement | null) => {
      if (!menu) {
        return;
      }
      queueMicrotask(() => {
        const target = openedBy === 'keyboard' ? keysOf(menu)[0] : menu;
        target?.focus({ preventScroll: true });
      });
    },
    [openedBy],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close(false);
      return;
    }
    const keys = keysOf(event.currentTarget);
    const active = document.activeElement;
    const index = active instanceof HTMLElement ? keys.indexOf(active) : -1;
    const next = moveInGrid(rowsOf(keys), index, event.key);
    if (next !== null) {
      event.preventDefault();
      keys[next]?.focus();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && index >= 0) {
      event.preventDefault();
      keys[index]?.click();
      return;
    }
    const shortcuts = keys.map((key) => key.getAttribute('aria-keyshortcuts'));
    const hit = shortcutTarget(shortcuts, event);
    if (hit >= 0) {
      event.preventDefault();
      keys[hit]?.focus();
      keys[hit]?.click();
    }
  };

  const classes = cn(
    'group/remote flex flex-col gap-2 outline-none',
    PANEL[layout],
  );

  return (
    <div
      aria-label={label}
      className={classes}
      data-layout={layout}
      id={id}
      onKeyDown={handleKeyDown}
      ref={focusOnOpen}
      role="menu"
      style={inkStyle}
      tabIndex={-1}
    >
      {children}
      {layout === 'popover' ? (
        <p aria-hidden className="text-center text-caption text-rk-w64">
          Press a letter · Esc closes
        </p>
      ) : null}
    </div>
  );
}
