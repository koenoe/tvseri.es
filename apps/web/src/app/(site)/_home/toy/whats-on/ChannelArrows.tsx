'use client';

import { useCallback } from 'react';

import CircleButton from '@/components/ui/button/CircleButton';
import { chevronDownGlyph } from '@/components/ui/icon/glyphs';

/**
 * Channel up and down, at the right end of the remote's label row, level with the screen's top.
 */
export default function ChannelArrows({
  current,
  onTune,
}: Readonly<{ current: number; onTune: (index: number) => void }>) {
  const up = useCallback(() => onTune(current - 1), [current, onTune]);
  const down = useCallback(() => onTune(current + 1), [current, onTune]);
  return (
    <>
      <CircleButton
        className="[&>svg]:rotate-180"
        icon={chevronDownGlyph}
        label="Channel up"
        onClick={up}
      />
      <CircleButton
        icon={chevronDownGlyph}
        label="Channel down"
        onClick={down}
      />
    </>
  );
}
