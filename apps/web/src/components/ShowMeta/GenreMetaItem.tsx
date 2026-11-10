import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

import { TagIcon } from '@/components/Icons/TagIcon';
import MetaItem from '@/components/MetaRow/MetaItem';

/**
 * The genre slot of `ShowMeta`: the only item of variable length, so it's the
 * one that shrinks and truncates with "…".
 */
export default function GenreMetaItem({
  children,
  className,
}: Readonly<{
  children?: ReactNode;
  className?: string;
}>) {
  const classes = twMerge('shrink', className);

  return (
    <MetaItem className={classes} icon={TagIcon}>
      {children}
    </MetaItem>
  );
}
