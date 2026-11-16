import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

import Icon from '@/components/ui/icon/Icon';
import type { Glyph, IconSize, ToggleGlyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

const item = cva('group/meta-item inline-flex min-w-0 items-center gap-1.5', {
  defaultVariants: { tone: 'default' },
  variants: {
    tone: {
      /** next up, progress (accent replaces the step) */
      cyan: 'text-cyan',
      default: '',
      /** the fact that matters most in the line */
      highlight: 'text-white/80',
      /** premieres, upcoming dates */
      pink: 'text-pink',
    },
  },
});

/**
 * One fact in a `MetaRow`, always with a 13px icon. Renders nothing without
 * content (null, undefined, false or ''; 0 is shown), so a missing value can
 * be passed as is.
 *
 * Items keep their width; the one item that may truncate opts in with
 * `shrink` (genres, a long network name). Text stays on one line with an
 * ellipsis, and the full text is in its `title` for hover.
 *
 * Each item starts with a visually hidden ", " (dropped on the first) so
 * screen readers don't run the items together.
 */
export default function MetaItem({
  active,
  children,
  className,
  icon,
  iconSize = 13,
  shrink,
  title,
  tone,
}: Readonly<{
  /** Filled drawing of a toggle glyph (a watched eye). */
  active?: boolean;
  children?: ReactNode;
  className?: string;
  icon: Glyph | ToggleGlyph;
  /** 13 by default; a board's denser line may draw 12 */
  iconSize?: IconSize;
  /** This item truncates first when the line is too narrow. */
  shrink?: boolean;
  /** Hover text when the content isn't a plain string. */
  title?: string;
}> &
  VariantProps<typeof item>) {
  if (
    children === null ||
    children === undefined ||
    children === false ||
    children === ''
  ) {
    return null;
  }

  const classes = cn(item({ tone }), shrink ? 'shrink' : 'shrink-0', className);
  const hoverText =
    title ??
    (typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : undefined);

  return (
    <span className={classes}>
      <span className="sr-only group-first/meta-item:hidden">, </span>
      {icon.filled ? (
        <Icon
          active={active}
          className="shrink-0"
          glyph={icon}
          size={iconSize}
        />
      ) : (
        <Icon className="shrink-0" glyph={icon} size={iconSize} />
      )}
      <span className="truncate" title={hoverText}>
        {children}
      </span>
    </span>
  );
}
