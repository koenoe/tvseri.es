import Link from 'next/link';
import type { ComponentProps } from 'react';

import { type ChipVariantProps, chipStyles } from './buttonStyles';

/**
 * A keyword or sub-genre chip that links to its landing.
 *
 * @example
 * <ChipLink href="/theme/post-apocalyptic">Post-apocalyptic</ChipLink>
 */
export default function ChipLink({
  className,
  variant,
  ...rest
}: ComponentProps<typeof Link> & ChipVariantProps) {
  const classes = chipStyles({ className, variant });
  return <Link className={classes} {...rest} />;
}
