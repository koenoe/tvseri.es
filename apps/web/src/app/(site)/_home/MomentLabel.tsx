import type { ReactNode } from 'react';

import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

/**
 * The label's look (HMFinal `.e2-k`), the same in every block: the overline
 * in capitals, grey like its icon, the icon 8px before it. `className` is
 * the label's place in its block, never another look
 */
const MOMENT_LABEL =
  'flex min-w-0 items-center gap-2 text-overline text-white/60 uppercase';

/**
 * A moment's heading inside its block (HMFinal `e2-k`): an icon and the
 * moment's name, where the board draws it (Connected by's head row, the
 * Binge calculator's and the Countdown's top left, What's on's remote, the
 * first line of One season in stills) instead of a title above the block.
 * It is the block's only heading, so it is an h2 like the rows' titles.
 */
export default function MomentLabel({
  children,
  className,
  glyph,
  id,
  title,
}: Readonly<{
  /** after the words: a placeholder's bar where the name still to come goes */
  children?: ReactNode;
  /** its place in the row it heads */
  className?: string;
  glyph: Glyph;
  id?: string;
  title: string;
}>) {
  const classes = cn(MOMENT_LABEL, className);
  return (
    <h2 className={classes} id={id}>
      <Icon className="size-[15px] shrink-0" glyph={glyph} size={16} />
      <span className="truncate">{title}</span>
      {children}
    </h2>
  );
}
