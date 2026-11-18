'use client';

import { memo, useCallback } from 'react';

import CircleButton from '@/components/ui/button/CircleButton';
import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';

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
  const className = enabled ? undefined : 'pointer-events-none';
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
