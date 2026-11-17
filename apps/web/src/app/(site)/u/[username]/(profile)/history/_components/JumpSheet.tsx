'use client';

import { Dialog } from '@/components/ui/dialog/Dialog';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { JumpYear } from '@/lib/profile/diary';
import { useActiveMonth } from '../_lib/activeMonth';
import JumpList from './JumpList';

type Week = Readonly<{ episodes: number; last: string | null }>;

/** The phone month header's Jump (`.chip`, 30px) */
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

/**
 * The phone's Jump to: the same list as the sidebar in a bottom sheet
 * (the phone's version). A pick closes it; the jump goes on underneath.
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
  // read here, so a new active month re-renders the sheet, not the diary
  const active = useActiveMonth();
  const close = () => onOpenChange(false);
  return (
    <Dialog
      className="max-sm:bg-[#161b1c]"
      onOpenChange={onOpenChange}
      open={open}
      title="Jump to"
    >
      <JumpList
        active={active}
        basePath={basePath}
        index={index}
        onPick={close}
        week={week}
      />
    </Dialog>
  );
}
