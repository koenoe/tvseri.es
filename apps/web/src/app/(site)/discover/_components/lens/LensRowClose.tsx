'use client';

import { useCallback } from 'react';

import CircleButton from '@/components/ui/button/CircleButton';
import { closeGlyph } from '@/components/ui/icon/glyphs';

import { tileId, useLens } from './LensProvider';

const CLASS_NAME = 'text-white';

/** Closes the open row and puts focus back on its tile */
export default function LensRowClose({
  row,
  title,
}: Readonly<{ row: string; title: string }>) {
  const closeRow = useLens((state) => state.closeRow);
  const onClick = useCallback(() => {
    document.getElementById(tileId(row))?.focus();
    closeRow();
  }, [closeRow, row]);
  const label = `Close ${title}`;
  // `title` stays unset: the row's own title sits beside the cross
  return (
    <CircleButton
      className={CLASS_NAME}
      icon={closeGlyph}
      iconSize={14}
      label={label}
      onClick={onClick}
      title={undefined}
    />
  );
}
