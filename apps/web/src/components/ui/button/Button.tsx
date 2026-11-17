import type { ComponentProps, ReactNode } from 'react';

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
    /** Only where a board draws a size off the button's default. */
    iconSize?: IconSize;
    /** Busy: the icon becomes the pending ring and clicks are ignored. */
    pending?: boolean;
    /** A toggle (watched, seen it): sets `aria-pressed` and fills the icon. */
    pressed?: boolean;
    trailingIcon?: Glyph;
  }>;

/**
 * A pill button from the boards. Works in Server Components (no hooks); pass
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

  return (
    <button
      aria-busy={pending || undefined}
      aria-disabled={pending || ariaDisabled}
      aria-pressed={pressed}
      className={classes}
      onClick={handleClick}
      type={type}
      {...rest}
    >
      <ButtonContent
        active={pressed}
        icon={icon}
        iconSize={resolvedIconSize}
        pending={pending}
        trailingIcon={trailingIcon}
      >
        {children}
      </ButtonContent>
    </button>
  );
}
