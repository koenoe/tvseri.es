import type { ReactNode } from 'react';

import Icon from '@/components/ui/icon/Icon';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

/** A sidebar fact list: 14/24 white/80, 12px apart (8 on phones) */
export const FACTS = 'flex flex-col gap-2 text-body-sm text-white/80 lg:gap-3';

/** One fact: a 15px line icon (13 on phones), 10px (8) from its text */
export default function Fact({
  children,
  className,
  icon,
}: Readonly<{
  children: ReactNode;
  className?: string;
  icon: Glyph | ToggleGlyph;
}>) {
  const classes = cn('flex min-w-0 items-center gap-2 lg:gap-2.5', className);
  return (
    <span className={classes}>
      <Icon className="shrink-0 max-lg:size-[13px]" glyph={icon} size={15} />
      <span className="min-w-0">{children}</span>
    </span>
  );
}
