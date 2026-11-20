import type { ComponentProps } from 'react';

import { checkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MarkSwap from '@/components/ui/icon/MarkSwap';
import type { IconSize } from '@/components/ui/icon/types';

/** One place's look for the circle: its classes per state and its check's size */
export type StepCircleLayout = Readonly<{
  /** both states: the box, the centring, the numeral's type */
  base: string;
  check: IconSize;
  /** the done state: the filled disc */
  done: string;
  /** the open state: the ring and the numeral's colour */
  todo: string;
}>;

type Props = Omit<ComponentProps<'span'>, 'children' | 'className'> &
  Readonly<{
    done: boolean;
    layout: StepCircleLayout;
    number: number;
  }>;

/**
 * A step's numbered circle (Get started on Home and the profile, import's
 * steps): the number, or a check once the step is done; the number swaps
 * to the check (`MarkSwap`, still on the first render). Each place keeps
 * its own look through its layout; any `span` prop (an `aria-hidden`) is
 * the place's own.
 */
export default function StepCircle({ done, layout, number, ...rest }: Props) {
  const classes = `${layout.base} ${done ? layout.done : layout.todo}`;
  const content = done ? (
    <Icon glyph={checkGlyph} size={layout.check} />
  ) : (
    number
  );
  const swapKey = done ? 'done' : 'number';
  return (
    <span className={classes} {...rest}>
      <MarkSwap swapKey={swapKey}>{content}</MarkSwap>
    </span>
  );
}
