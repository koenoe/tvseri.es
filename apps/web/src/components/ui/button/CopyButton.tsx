'use client';

import { type ReactNode, useRef, useState } from 'react';

import { CROSSFADE } from '@/components/motion/lateFade';
import { checkGlyph, copyGlyph } from '@/components/ui/icon/glyphs';
import IconSwap from '@/components/ui/icon/IconSwap';
import { showToast } from '@/components/ui/toast/showToast';

import Button from './Button';
import { BUTTON_ICON_SIZE, type ButtonSize } from './buttonStyles';

/** How long the check stays after a copy */
export const COPIED_HOLD_MS = 1500;

/**
 * The label and "Copied" in one grid cell, so the button keeps one width
 * (the wider word's) and nothing beside it moves; the one not said is
 * hidden, from a screen reader too
 */
const WORD = `col-start-1 row-start-1 truncate ${CROSSFADE}`;
const SAID = WORD;
const UNSAID = `${WORD} invisible opacity-0`;

const pageAddress = () =>
  `${window.location.origin}${window.location.pathname}`;

/**
 * Copy, on the tonal pill: writes `text` to the clipboard and answers twice,
 * where the eye is (the copy icon turns into a cyan check for a moment) and
 * in a toast, which the toaster's live region reads out. For that moment
 * the label says Copied, cross-fading in the button's one width.
 *
 * @example
 * <CopyButton copied="Copied your code" text={code}>Copy</CopyButton>
 */
export default function CopyButton({
  children,
  className,
  copied,
  disabled,
  failed = 'Couldn’t copy. Select it and copy it.',
  size,
  text,
}: Readonly<{
  children: ReactNode;
  className?: string;
  /** The toast once it's copied: "Copied your code" */
  copied: string;
  disabled?: boolean;
  /** The toast when the clipboard refuses */
  failed?: string;
  size?: ButtonSize;
  /**
   * What to copy: this page's address when left out; a function for text
   * fetched on the press (null: nothing to copy, and it said why itself)
   */
  text?: string | (() => Promise<string | null>);
}>) {
  const [done, setDone] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copy = async () => {
    try {
      const value =
        typeof text === 'function' ? await text() : (text ?? pageAddress());
      if (value === null) {
        return;
      }
      await navigator.clipboard.writeText(value);
      showToast({ title: copied });
      clearTimeout(hold.current);
      setDone(true);
      hold.current = setTimeout(() => setDone(false), COPIED_HOLD_MS);
    } catch {
      showToast({ title: failed, tone: 'error' });
    }
  };

  const glyph = done ? checkGlyph : copyGlyph;
  const tint = done ? 'text-cyan' : undefined;
  const iconSize = BUTTON_ICON_SIZE[size ?? 'md'];
  const labelHidden = done || undefined;
  const copiedHidden = !done || undefined;
  return (
    <Button
      className={className}
      disabled={disabled}
      onClick={copy}
      size={size}
      variant="tonal"
    >
      <IconSwap className={tint} glyph={glyph} size={iconSize} />
      <span className="grid min-w-0">
        <span aria-hidden={labelHidden} className={done ? UNSAID : SAID}>
          {children}
        </span>
        <span aria-hidden={copiedHidden} className={done ? SAID : UNSAID}>
          Copied
        </span>
      </span>
    </Button>
  );
}
