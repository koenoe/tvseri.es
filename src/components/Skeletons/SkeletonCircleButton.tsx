'use client';

import { cx } from 'class-variance-authority';

import { circleButtonStyles } from '../Buttons/CircleButton';

export default function SkeletonCircleButton() {
  return (
    <div
      className={cx(
        'animate-pulse border-white/10 bg-white/10',
        circleButtonStyles(),
      )}
    />
  );
}
