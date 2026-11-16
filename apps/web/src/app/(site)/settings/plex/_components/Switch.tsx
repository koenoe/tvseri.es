import type { ComponentProps } from 'react';

import cn from '@/lib/cn';

import { SWITCH_BOX_CLASS } from './layout';

/**
 * The switch: 44 × 26, a white thumb that slides
 * 18px (transform only). The page owns the state.
 */
export default function Switch({
  checked,
  className,
  ...rest
}: Omit<ComponentProps<'button'>, 'aria-checked' | 'role'> &
  Readonly<{ checked: boolean }>) {
  const classes = cn(
    SWITCH_BOX_CLASS,
    'cursor-pointer bg-white/16 transition-[background-color,color] duration-200',
    'after:absolute after:top-0.75 after:left-0.75 after:size-5 after:rounded-full after:bg-white after:transition-transform after:duration-200',
    'aria-checked:bg-white aria-checked:after:translate-x-4.5 aria-checked:after:bg-[#171717]',
    className,
  );
  return (
    <button
      aria-checked={checked}
      className={classes}
      role="switch"
      type="button"
      {...rest}
    />
  );
}
