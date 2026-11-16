import type { ComponentProps } from 'react';

import type { IconSize } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

import FoldLabel from './FoldLabel';

/** One place's look for the control: its button classes and its chevron size */
export type ExpandLayout = Readonly<{
  button: string;
  chevron: IconSize;
}>;

type Props = Omit<
  ComponentProps<'button'>,
  'aria-expanded' | 'children' | 'type'
> &
  Readonly<{
    layout: ExpandLayout;
    /** the folded label: "Show all 22" */
    label: string;
    open: boolean;
  }>;

/**
 * The "Show all 22" / "Show fewer" button every fold uses: the frame, the
 * `aria-expanded` and the shared label with its turning chevron. What the
 * press does is the caller's `onClick`; how it looks is the caller's layout
 * (each place keeps its own look).
 */
export default function ExpandButton({
  className,
  label,
  layout,
  open,
  ...rest
}: Props) {
  const classes = cn(layout.button, className);
  return (
    <button aria-expanded={open} className={classes} type="button" {...rest}>
      <FoldLabel label={label} open={open} size={layout.chevron} />
    </button>
  );
}
