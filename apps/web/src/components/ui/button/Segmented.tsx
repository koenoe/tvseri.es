import type { ComponentProps } from 'react';

import { segmentedItemStyles, segmentedStyles } from './buttonStyles';

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
  type = 'button',
  ...rest
}: ComponentProps<'button'> & Readonly<{ pressed: boolean }>) {
  const classes = segmentedItemStyles({ className });
  return (
    <button aria-pressed={pressed} className={classes} type={type} {...rest} />
  );
}
