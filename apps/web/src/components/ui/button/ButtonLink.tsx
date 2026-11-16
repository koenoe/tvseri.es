import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import type { Glyph, IconSize } from '@/components/ui/icon/types';

import ButtonContent from './ButtonContent';
import {
  BUTTON_ICON_SIZE,
  type ButtonVariantProps,
  buttonStyles,
} from './buttonStyles';

type Props = Omit<ComponentProps<typeof Link>, 'children'> &
  ButtonVariantProps &
  Readonly<{
    children: ReactNode;
    icon?: Glyph;
    iconSize?: IconSize;
  }>;

/**
 * A `next/link` that looks like a `Button` (same variants and sizes). It
 * navigates, so its icon leads: no trailing
 * icon.
 *
 * @example
 * <ButtonLink href="/discover" icon={arrowRightGlyph}>Back to Discover</ButtonLink>
 */
export default function ButtonLink({
  children,
  className,
  icon,
  iconSize,
  size,
  variant,
  ...rest
}: Props) {
  const classes = buttonStyles({ className, size, variant });
  const resolvedIconSize = iconSize ?? BUTTON_ICON_SIZE[size ?? 'md'];
  return (
    <Link className={classes} {...rest}>
      <ButtonContent icon={icon} iconSize={resolvedIconSize}>
        {children}
      </ButtonContent>
    </Link>
  );
}
