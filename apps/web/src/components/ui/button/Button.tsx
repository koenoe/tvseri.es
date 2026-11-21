import type { ComponentProps, ReactNode } from 'react';

import { pendingGlyph } from '@/components/ui/icon/glyphs';
import IconSwap from '@/components/ui/icon/IconSwap';
import type { Glyph, IconSize, ToggleGlyph } from '@/components/ui/icon/types';

import ButtonContent from './ButtonContent';
import {
  BUTTON_ICON_SIZE,
  type ButtonVariantProps,
  buttonStyles,
} from './buttonStyles';
import pendingClick from './pendingClick';

type Props = Omit<ComponentProps<'button'>, 'children'> &
  ButtonVariantProps &
  Readonly<{
    children: ReactNode;
    /** Leading icon; a toggle glyph fills while `pressed`. */
    icon?: Glyph | ToggleGlyph;
    iconSize?: IconSize;
    /** Busy: the icon becomes the pending ring and clicks are ignored. */
    pending?: boolean;
    /** A toggle (watched, seen it): sets `aria-pressed` and fills the icon. */
    pressed?: boolean;
    trailingIcon?: Glyph;
  }>;

/**
 * A pill button. Works in Server Components (no hooks); pass
 * `onClick` from a client component.
 *
 * @example
 * <Button icon={plusGlyph} variant="primary">Watchlist</Button>
 * <Button icon={eyeGlyph} pressed={seen} onClick={toggle}>Seen it</Button>
 */
export default function Button({
  'aria-disabled': ariaDisabled,
  children,
  className,
  icon,
  iconSize,
  onClick,
  pending,
  pressed,
  size,
  trailingIcon,
  type = 'button',
  variant,
  ...rest
}: Props) {
  const classes = buttonStyles({ className, size, variant });
  const resolvedIconSize = iconSize ?? BUTTON_ICON_SIZE[size ?? 'md'];
  const handleClick = pendingClick(pending, onClick);
  const busy = pending || undefined;
  const blocked = pending || ariaDisabled;
  // A pill that can change (`pressed` or `pending` given) swaps its icon; a
  // static one keeps ButtonContent's plain server-drawn `Icon`
  const swaps = pressed !== undefined || pending !== undefined;
  const swapGlyph = pending ? pendingGlyph : (icon ?? null);
  const leading = swaps ? (
    <IconSwap active={pressed} glyph={swapGlyph} size={resolvedIconSize} />
  ) : undefined;

  return (
    <button
      aria-busy={busy}
      aria-disabled={blocked}
      aria-pressed={pressed}
      className={classes}
      onClick={handleClick}
      type={type}
      {...rest}
    >
      <ButtonContent
        icon={icon}
        iconSize={resolvedIconSize}
        leading={leading}
        trailingIcon={trailingIcon}
      >
        {children}
      </ButtonContent>
    </button>
  );
}
