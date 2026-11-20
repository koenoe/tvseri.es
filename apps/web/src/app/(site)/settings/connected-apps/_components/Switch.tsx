import type { ComponentProps } from 'react';

import cn from '@/lib/cn';

import { SWITCH_BOX_CLASS } from './layout';

/**
 * A controlled switch; the thumb moves by translate only, on the sheet
 * curve (`SHEET_EASE`), its colour fading with the track. `::after` is the
 * thumb, so the target's reach above and below (26px, 44 to the pointer)
 * is `::before`.
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
    'before:absolute before:inset-x-0 before:-inset-y-[9px]',
    'after:absolute after:top-0.75 after:left-0.75 after:size-5 after:rounded-full after:bg-white after:transition-[translate,background-color] after:duration-200 after:ease-[cubic-bezier(0.32,0.72,0,1)]',
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
