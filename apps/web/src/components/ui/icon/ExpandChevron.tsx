import cn from '@/lib/cn';

import { chevronDownGlyph } from './glyphs';
import Icon from './Icon';
import type { IconSize } from './types';

/**
 * The chevron of every Show all / Show fewer control: down while folded, turned
 * 180° when open, with the season select's 180ms turn. One drawing and one
 * timing for the show page's wall and the person page's lists.
 */
export default function ExpandChevron({
  className,
  open,
  size,
}: Readonly<{ className?: string; open: boolean; size: IconSize }>) {
  const classes = cn(
    'flex-none transition-transform duration-180',
    open && 'rotate-180',
    className,
  );
  return <Icon className={classes} glyph={chevronDownGlyph} size={size} />;
}
