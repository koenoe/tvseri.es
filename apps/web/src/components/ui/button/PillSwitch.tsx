'use client';

import { LayoutGroup } from 'motion/react';
import * as m from 'motion/react-m';
import { type ComponentProps, useId } from 'react';

import MaxMotion from '@/components/motion/MaxMotion';
import { Ghost } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import { pillSwitchItemStyles, pillSwitchStyles } from './buttonStyles';

/**
 * The pill switch on a picture: a group of toggle buttons on
 * one dark rounded ground, one pressed. From your circle's picks and the
 * Countdown's premieres. The caller owns the state and the place
 * (`className`); each choice is a `PillSwitchItem`. The pressed fill slides
 * to the new choice (production's spring); each switch is its own layout
 * group, so two on a page never trade fills.
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
  const group = useId();
  return (
    <MaxMotion>
      <LayoutGroup id={group}>
        <div aria-label={label} className={classes} role="group" {...rest} />
      </LayoutGroup>
    </MaxMotion>
  );
}

/** Production's tab pill's slide, without its bounce: the fill lands, it doesn't wobble */
const SLIDE = { bounce: 0, duration: 0.4, type: 'spring' } as const;
const FILL = 'absolute inset-0 rounded-full bg-white/14';
const LABEL = 'relative min-w-0 truncate';

export function PillSwitchItem({
  children,
  className,
  pressed,
  type = 'button',
  ...rest
}: ComponentProps<'button'> & Readonly<{ pressed: boolean }>) {
  const classes = pillSwitchItemStyles({ className });
  return (
    <button aria-pressed={pressed} className={classes} type={type} {...rest}>
      {pressed ? (
        <m.span
          aria-hidden="true"
          className={FILL}
          layoutId="pill-switch-fill"
          transition={SLIDE}
        />
      ) : null}
      <span className={LABEL}>{children}</span>
    </button>
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
