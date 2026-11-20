'use client';

import { memo, useCallback } from 'react';

import CircleButton from '@/components/ui/button/CircleButton';
import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';

/**
 * 40px on a phone (the eye's size, 20px chevrons), 44 to the thumb: the
 * `::after` starts inside the 2px ring, so 4px reach is 2px past it, 2 of
 * the 6px gap between the two.
 */
const STEP =
  'max-sm:size-10 max-sm:[&>svg]:size-5 max-sm:after:absolute max-sm:after:-inset-1 max-sm:after:rounded-full';

const PREVIOUS = { icon: chevronLeftGlyph, label: 'Previous episode' };
const NEXT = { icon: chevronRightGlyph, label: 'Next episode' };

/**
 * The stub's ‹ / › : dimmed, unfocusable and
 * inert only at the show's first and last episode.
 */
function StepButton({
  direction,
  enabled,
  onStep,
}: Readonly<{
  direction: -1 | 1;
  enabled: boolean;
  onStep: (direction: -1 | 1) => void;
}>) {
  const { icon, label } = direction === -1 ? PREVIOUS : NEXT;
  const step = useCallback(() => {
    if (enabled) {
      onStep(direction);
    }
  }, [direction, enabled, onStep]);
  const className = cn(STEP, !enabled && 'pointer-events-none');
  const tabIndex = enabled ? 0 : -1;
  const disabled = !enabled;
  return (
    <CircleButton
      aria-disabled={disabled}
      className={className}
      icon={icon}
      label={label}
      onClick={step}
      tabIndex={tabIndex}
    />
  );
}

const MemoStepButton = memo(StepButton);
MemoStepButton.displayName = 'StepButton';
export default MemoStepButton;
