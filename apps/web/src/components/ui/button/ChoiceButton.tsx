'use client';

import type { ComponentProps } from 'react';

import { useFillGlide } from '@/components/motion/fillGlide';

/**
 * One choice in a row whose chosen one is filled (a `Segmented`, the
 * importer's tabs and From column / Fixed, the binge calculator's options):
 * the fill, the button's `::before` in the caller's look, glides from the
 * choice made before (`useFillGlide`). `on` is the choice's state; the
 * caller still says it to assistive tech (`aria-pressed`, `aria-selected`).
 */
export default function ChoiceButton({
  on,
  type = 'button',
  ...rest
}: ComponentProps<'button'> & Readonly<{ on: boolean }>) {
  const ref = useFillGlide(on);
  return <button ref={ref} type={type} {...rest} />;
}
