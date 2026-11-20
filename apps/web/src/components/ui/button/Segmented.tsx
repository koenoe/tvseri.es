'use client';

import { type ComponentProps, useLayoutEffect, useRef } from 'react';

import { GLIDE, sidewaysGlide } from '@/components/motion/glide';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

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

/**
 * Each group's pressed item, by the group's element. The item that becomes
 * pressed reads the one before it here, so the glide needs neither the
 * group to re-render (an item may follow a store by itself) nor the items
 * to commit in any order.
 */
const pressedIn = new WeakMap<Element, HTMLElement>();

/** The fill's resting corner: its own, at most half its height */
function cornerOf(item: HTMLElement): number {
  const half = item.offsetHeight / 2;
  const own = Number.parseFloat(
    getComputedStyle(item, '::before').borderTopLeftRadius,
  );
  return Number.isNaN(own) ? half : Math.min(own, half);
}

/** The pressed fill glides from the item pressed before (not on mount) */
function useFillGlide(pressed: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const item = ref.current;
    const group = item?.parentElement;
    if (!pressed || !item || !group) {
      return;
    }
    const before = pressedIn.get(group);
    pressedIn.set(group, item);
    // Without Web Animations (jsdom) the fill is simply on its item
    if (
      !before ||
      before === item ||
      !before.isConnected ||
      typeof item.animate !== 'function' ||
      matchesNow(REDUCED_MOTION)
    ) {
      return;
    }
    const frames = sidewaysGlide(
      { left: before.offsetLeft, width: before.offsetWidth },
      { left: item.offsetLeft, width: item.offsetWidth },
      cornerOf(item),
    );
    item.animate(frames, { ...GLIDE, pseudoElement: '::before' });
  }, [pressed]);
  return ref;
}

export function SegmentedItem({
  className,
  pressed,
  type = 'button',
  ...rest
}: ComponentProps<'button'> & Readonly<{ pressed: boolean }>) {
  const ref = useFillGlide(pressed);
  const classes = segmentedItemStyles({ className });
  return (
    <button
      aria-pressed={pressed}
      className={classes}
      ref={ref}
      type={type}
      {...rest}
    />
  );
}
