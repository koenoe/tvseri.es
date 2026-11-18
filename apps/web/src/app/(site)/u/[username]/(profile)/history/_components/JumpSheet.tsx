'use client';

import { useCallback } from 'react';

import { Dialog } from '@/components/ui/dialog/Dialog';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { JumpYear } from '@/lib/profile/diary';
import { useActiveMonth } from '../_lib/activeMonth';
import JumpList from './JumpList';

type Week = Readonly<{ episodes: number; last: string | null }>;

/** The phone month header's Jump (30px) */
export function JumpButton({ onOpen }: Readonly<{ onOpen: () => void }>) {
  return (
    <button
      aria-haspopup="dialog"
      className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-white/6 px-3 text-meta font-medium text-white/80"
      onClick={onOpen}
      type="button"
    >
      <Icon glyph={calendarGlyph} size={13} />
      Jump
    </button>
  );
}

/** The sheet's list: only mounted while the sheet is open */
function SheetList({
  basePath,
  index,
  onPick,
  week,
}: Readonly<{
  basePath: string;
  index: ReadonlyArray<JumpYear>;
  onPick: () => void;
  week: Week | null;
}>) {
  // read here, so a closed sheet doesn't re-render on every scrolled month
  const active = useActiveMonth();
  return (
    <JumpList
      active={active}
      basePath={basePath}
      index={index}
      onPick={onPick}
      week={week}
    />
  );
}

/**
 * The phone's Jump to: the same list as the sidebar in a bottom sheet. A
 * pick closes it; the jump goes on underneath.
 */
export default function JumpSheet({
  basePath,
  index,
  onOpenChange,
  open,
  week,
}: Readonly<{
  basePath: string;
  index: ReadonlyArray<JumpYear>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  week: Week | null;
}>) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  return (
    <Dialog
      className="max-sm:bg-ground-deep"
      onOpenChange={onOpenChange}
      open={open}
      title="Jump to"
    >
      <SheetList basePath={basePath} index={index} onPick={close} week={week} />
    </Dialog>
  );
}
