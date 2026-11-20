'use client';

import type { ComponentProps } from 'react';

import { segmentedItemStyles, segmentedStyles } from './buttonStyles';
import ChoiceButton from './ChoiceButton';

/**
 * The row switch: a group of toggle buttons, one pressed.
 * The page owns the state; each item is a `SegmentedItem`.
 *
 * @example
 * <Segmented label="Kind of crime">
 *   <SegmentedItem pressed={kind === 'detective'} onClick={…}>Detective</SegmentedItem>
 * </Segmented>
 */
export function Segmented({
  className,
  label,
  ...rest
}: Omit<ComponentProps<'div'>, 'aria-label'> & Readonly<{ label: string }>) {
  const classes = segmentedStyles({ className });
  return <div aria-label={label} className={classes} role="group" {...rest} />;
}

export function SegmentedItem({
  className,
  pressed,
  ...rest
}: ComponentProps<'button'> & Readonly<{ pressed: boolean }>) {
  const classes = segmentedItemStyles({ className });
  return (
    <ChoiceButton
      aria-pressed={pressed}
      className={classes}
      on={pressed}
      {...rest}
    />
  );
}
