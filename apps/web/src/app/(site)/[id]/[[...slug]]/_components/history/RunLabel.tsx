'use client';

import type { EpisodeRef } from '@/lib/marking/types';

import type { SheetChip } from './chips';
import { runPreview } from './paint';
import { useSheetUi } from './sheetUi';

/**
 * The live label under a season's grid while a run is painted:
 * "Mark E6–E9" · "4 episodes · 2h 27m".
 */
export default function RunLabel({
  chips,
  minutesOf,
  seasonNumber,
}: Readonly<{
  seasonNumber: number;
  chips: ReadonlyArray<SheetChip>;
  minutesOf: (ref: EpisodeRef) => number;
}>) {
  const run = useSheetUi((state) =>
    state.run?.seasonNumber === seasonNumber ? state.run : null,
  );
  const mode = useSheetUi((state) => state.mode);
  const preview = run ? runPreview(chips, mode, run, minutesOf) : null;
  if (!preview) {
    return null;
  }
  return (
    <p
      aria-live="polite"
      className="flex items-baseline gap-2.5 text-caption text-white/60"
    >
      <b className="font-semibold text-white">{preview.title}</b>
      {preview.detail ? <span>{preview.detail}</span> : null}
    </p>
  );
}
