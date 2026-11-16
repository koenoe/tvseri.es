import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import cn from '@/lib/cn';

const row = cva(
  'relative flex min-w-0 max-w-full items-center gap-4 whitespace-nowrap text-meta text-white/60',
  {
    defaultVariants: { fit: 'overflow', numbers: 'proportional' },
    variants: {
      fit: {
        /**
         * One line that never cuts a value: an item that doesn't fit wraps
         * to a second line the row clips away, so whole facts drop from the
         * end (the order is what → when → how much, so how much goes
         * first). An item wider than the whole line ends with an ellipsis.
         * The row is one line tall (`h-5`; pass `h-[22px]` when it holds a
         * code badge).
         */
        drop: 'h-5 flex-wrap content-start gap-y-8 overflow-clip [&>*]:max-w-full',
        /** Items keep their width (the caller sizes the line) */
        overflow: '',
      },
      numbers: {
        proportional: '',
        /** rows that stack (season rows, lists): digits line up */
        tabular: 'tabular-nums',
      },
    },
  },
);

/**
 * One line of facts: 13px line icons, 6px from their text,
 * 16px between items, gaps only (never dots), so a missing item leaves
 * nothing behind. The line height is `--meta-row-height`, shared with
 * skeleton bars. Children are `MetaItem`s. Where the line can be narrower
 * than its facts (lanes, cards, phones), use `fit="drop"`: the last facts
 * drop whole instead of being cut.
 *
 * @example
 * <MetaRow>
 *   <MetaItem icon={calendarGlyph}>2022</MetaItem>
 *   <MetaItem icon={seasonGlyph}>2 seasons</MetaItem>
 * </MetaRow>
 */
export default function MetaRow({
  className,
  fit,
  numbers,
  ...rest
}: ComponentProps<'div'> & VariantProps<typeof row>) {
  const classes = cn(row({ fit, numbers }), className);
  return <div className={classes} {...rest} />;
}
