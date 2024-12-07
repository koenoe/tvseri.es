'use client';

import { cx } from 'class-variance-authority';

import {
  type ButtonVariantProps,
  circleButtonStyles,
} from '../Buttons/CircleButton';

export default function SkeletonCircleButton({ size }: ButtonVariantProps) {
  return (
    <div
      className={cx(
        'relative overflow-hidden border-white/10 bg-white/5',
        circleButtonStyles({ size }),
      )}
    >
      <div className="absolute inset-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
