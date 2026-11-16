import type { ComponentProps } from 'react';

import { type BadgeVariantProps, badgeStyles } from './buttonStyles';

/**
 * A small label: "New" on an option, an episode code (S04E02), a count.
 *
 * @example
 * <Badge>New</Badge>
 * <Badge variant="code">S04E02</Badge>
 */
export default function Badge({
  className,
  variant,
  ...rest
}: ComponentProps<'span'> & BadgeVariantProps) {
  const classes = badgeStyles({ className, variant });
  return <span className={classes} {...rest} />;
}
