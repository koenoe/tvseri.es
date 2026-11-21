'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

import Icon from '@/components/ui/icon/Icon';
import MarkSwap from '@/components/ui/icon/MarkSwap';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

import PendingRing from './PendingRing';
import { useRemote } from './RemoteContext';
import { KEY_CHIP, SMALL_KEY } from './styles';
import type { RemoteKey } from './types';

type Props = RemoteKey &
  Readonly<{
    /** A toggle (`menuitemcheckbox`): latched (dark, “down”) when true. */
    checked?: boolean;
    /** Stay open after a press (the list toggles). */
    keepOpen?: boolean;
    /** Waiting for the server: the ring replaces the icon; not runnable again. */
    pending?: boolean;
  }>;

/** The key's icon: the pending ring while it waits, else its glyph, filled while latched */
function KeyIcon({
  checked,
  icon,
  pending,
}: Readonly<{
  checked?: boolean;
  icon: Glyph | ToggleGlyph;
  pending: boolean;
}>) {
  const latched = icon.filled !== undefined && checked === true;
  const key = pending ? 'pending' : latched ? 'on' : 'off';
  return (
    <MarkSwap swapKey={key}>
      {pending ? (
        <PendingRing />
      ) : icon.filled ? (
        <Icon active={checked} glyph={icon} size={20} />
      ) : (
        <Icon glyph={icon} size={20} />
      )}
    </MarkSwap>
  );
}

function KeyBody({
  checked,
  chip,
  icon,
  label,
  meta,
  pending,
}: Readonly<{
  checked?: boolean;
  chip: ReactNode;
  icon: Glyph | ToggleGlyph;
  label: string;
  meta?: string;
  pending: boolean;
}>) {
  return (
    <>
      <span className="text-rk-w80 in-aria-checked:text-white in-aria-disabled:text-rk-w40">
        <KeyIcon checked={checked} icon={icon} pending={pending} />
      </span>
      <span className="text-balance text-caption font-medium">{label}</span>
      {meta ? (
        // 12/16, the meta step
        <span className="text-balance text-caption leading-4 text-rk-meta">
          {meta}
        </span>
      ) : null}
      {chip}
    </>
  );
}

/**
 * A small key: icon, label up to two lines, an optional
 * reason under it, the letter chip. A link (`href`, `external` for a new tab)
 * or a button (`onSelect`); it closes the Remote unless `keepOpen`.
 */
export default function KeyButton({
  checked,
  disabled = false,
  external,
  href,
  icon,
  keepOpen = false,
  label,
  letter,
  meta,
  onSelect,
  pending = false,
}: Props) {
  const { close, layout } = useRemote();
  const isToggle = checked !== undefined;
  const classes = cn(SMALL_KEY, disabled && 'cursor-default');
  const chip =
    layout === 'popover' ? (
      <span aria-hidden className={KEY_CHIP}>
        {letter}
      </span>
    ) : null;
  const common = {
    'aria-checked': isToggle ? checked : undefined,
    'aria-disabled': disabled || undefined,
    'aria-keyshortcuts': letter,
    className: classes,
    'data-remote-key': '',
    role: isToggle ? 'menuitemcheckbox' : 'menuitem',
    tabIndex: -1,
  } as const;
  const body = (
    <KeyBody
      checked={checked}
      chip={chip}
      icon={icon}
      label={label}
      meta={meta}
      pending={pending}
    />
  );

  if (href !== undefined && !onSelect) {
    const follow = (event: MouseEvent) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      close(false);
    };
    return external ? (
      <a
        {...common}
        href={href}
        onClick={follow}
        rel="noopener"
        target="_blank"
      >
        {body}
      </a>
    ) : (
      <Link {...common} href={href} onClick={follow}>
        {body}
      </Link>
    );
  }

  const run = () => {
    if (disabled || pending) {
      return;
    }
    if (!keepOpen) {
      close(true);
    }
    onSelect?.();
  };
  const busy = pending || undefined;

  return (
    <button {...common} aria-busy={busy} onClick={run} type="button">
      {body}
    </button>
  );
}
