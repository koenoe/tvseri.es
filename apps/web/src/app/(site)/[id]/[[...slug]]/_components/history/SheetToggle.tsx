import type { ComponentProps } from 'react';

import { eyeGlyph } from '@/components/ui/icon/glyphs';
import IconSwap from '@/components/ui/icon/IconSwap';
import cn from '@/lib/cn';

const SIZE = {
  /** "Mark all watched" (34px, 13px) */
  md: 'h-[34px] gap-[7px] pr-3.5 pl-2.5 text-meta',
  /** "Mark season" (30px, 12px, a 14px eye) */
  sm: 'h-7.5 gap-1.5 pr-3 pl-2 text-caption',
} as const;

/**
 * The sheet's mark / unmark pill: tonal while there is
 * something to mark, a quiet ring once complete (`pressed`). The eye is an
 * outline until then and fills once done, as the episode pills' eyes.
 */
export default function SheetToggle({
  children,
  className,
  pressed,
  size,
  ...rest
}: Omit<ComponentProps<'button'>, 'type'> &
  Readonly<{ pressed: boolean; size: keyof typeof SIZE }>) {
  const classes = cn(
    'inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full font-medium transition-[background-color,box-shadow,color,scale] duration-150 ease-out active:scale-96 aria-disabled:active:scale-100',
    'bg-white/8 text-white hover:bg-white/16',
    'aria-pressed:bg-transparent aria-pressed:text-white/85 aria-pressed:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] aria-pressed:hover:bg-white/6',
    'aria-disabled:cursor-default aria-disabled:opacity-30',
    SIZE[size],
    className,
  );
  const iconClass = size === 'sm' ? 'size-3.5' : undefined;
  return (
    <button aria-pressed={pressed} className={classes} type="button" {...rest}>
      <IconSwap
        active={pressed}
        className={iconClass}
        glyph={eyeGlyph}
        size={16}
      />
      <span>{children}</span>
    </button>
  );
}
