import type { ComponentProps } from 'react';

import { Ghost } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import { pillSwitchItemStyles, pillSwitchStyles } from './buttonStyles';

/**
 * The pill switch on a picture: a group of toggle buttons on
 * one dark rounded ground, one pressed. From your circle's picks and the
 * Countdown's premieres. The caller owns the state and the place
 * (`className`); each choice is a `PillSwitchItem`.
 *
 * @example
 * <PillSwitch label="Picks">
 *   <PillSwitchItem pressed={active === 0} onClick={…}>Dark</PillSwitchItem>
 * </PillSwitch>
 */
export function PillSwitch({
  className,
  label,
  ...rest
}: Omit<ComponentProps<'div'>, 'aria-label'> & Readonly<{ label: string }>) {
  const classes = pillSwitchStyles({ className });
  return <div aria-label={label} className={classes} role="group" {...rest} />;
}

export function PillSwitchItem({
  className,
  pressed,
  type = 'button',
  ...rest
}: ComponentProps<'button'> & Readonly<{ pressed: boolean }>) {
  const classes = pillSwitchItemStyles({ className });
  return (
    <button aria-pressed={pressed} className={classes} type={type} {...rest} />
  );
}

/** Its placeholder: the ground's padding and `count` flat 28px choices */
export function PillSwitchGhost({
  className,
  count,
}: Readonly<{ className?: string; count: number }>) {
  const classes = cn('flex items-center gap-0.5 p-0.5', className);
  return (
    <span className={classes}>
      {Array.from({ length: count }, (_, n) => (
        <Ghost className="h-7 w-20 rounded-full" key={n} />
      ))}
    </span>
  );
}
