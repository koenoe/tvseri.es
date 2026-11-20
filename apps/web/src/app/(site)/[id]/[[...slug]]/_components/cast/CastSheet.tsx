'use client';

import { useId } from 'react';

import { DialogCloseCircle } from '@/components/ui/dialog/DialogClose';
import {
  SIDE_MOTION,
  SIDE_SCRIM_MOTION,
} from '@/components/ui/dialog/dialogMotion';
import { BACKDROP, SHADOW, SURFACE } from '@/components/ui/dialog/dialogStyles';
import ModalShell from '@/components/ui/dialog/ModalShell';
import SheetHandle from '@/components/ui/dialog/SheetHandle';
import cn from '@/lib/cn';
import { peopleCount } from '@/lib/series/castAndCrew';

import CastSheetList from './CastSheetList';

/**
 * One panel in two shapes: below md a bottom sheet (80% of the screen, 24px
 * top corners, the grab handle; it swipes down to close), from md a 480px
 * side panel the full height on the right, as every side panel slides in.
 */
/**
 * The list's scroll: it carries the side space itself (the gutter on phones,
 * 32px in the panel), so the rows' hover fill, which reaches 12px past the
 * text edge, stays inside it; nothing ever scrolls sideways. No top padding:
 * Safari sticks a sticky heading below it (Chrome at the edge), which let
 * rows show above the stuck heading; the list carries that space instead
 */
const SCROLL =
  'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-8 max-md:-mx-gutter max-md:px-gutter md:px-8';

const PANEL = cn(
  'flex flex-col',
  SURFACE.sheet,
  SHADOW.sheet,
  'max-md:h-[80dvh] max-md:w-full max-md:self-end max-md:rounded-t-[24px] max-md:px-gutter max-md:pt-2.5 max-md:shadow-[0_-20px_40px_rgb(0_0_0/0.4)]',
  // 480px: "The Lord of the Rings: The Rings of Power · 311 people" needs
  // 443 with the padding and the ✕
  'md:h-dvh md:w-120 md:max-w-full md:self-stretch md:justify-self-end md:border-white/8 md:border-l',
);

const HEADER =
  'flex shrink-0 items-center justify-between gap-3 max-md:mb-1 max-md:h-9 md:h-19 md:border-white/8 md:border-b md:pr-6 md:pl-8';

const TITLE = 'font-semibold text-[17px] leading-6 md:text-[20px] md:leading-7';

/** The show and the count: the side panel's second line (white/60, the app's contrast floor); the sheet has none */
const SUBTITLE =
  'mt-0.5 text-[13px] text-white/60 leading-[18px] max-md:hidden';
const SUBTITLE_LINE = cn(SUBTITLE, 'text-balance');

/**
 * The cast & crew sheet: everyone who made the show, the cast then the
 * crew in IMDb's sections, each face linking to the person. Its list loads when it opens
 * (`CastSheetList`). Loaded with its first press (`CastSheetButton`).
 */
export default function CastSheet({
  onOpenChange,
  open,
  title,
  total,
}: Readonly<{
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** the show's title */
  title: string;
  total: number;
}>) {
  const titleId = useId();
  const count = `· ${peopleCount(total)}`;
  return (
    <ModalShell
      backdropClassName={BACKDROP.side}
      backdropMotion={SIDE_SCRIM_MOTION}
      labelledBy={titleId}
      motion={SIDE_MOTION}
      onOpenChange={onOpenChange}
      open={open}
      panelClassName={PANEL}
      sheetBelow="md"
    >
      <SheetHandle className="mb-3 self-center md:hidden" />
      <header className={HEADER}>
        <div className="min-w-0">
          <h2 className={TITLE} id={titleId}>
            All cast &amp; crew
          </h2>
          {/* Fits one line at 480px; a longer title wraps, balanced, and
              "· 311 people" stays together */}
          <p className={SUBTITLE_LINE}>
            {title} <span className="whitespace-nowrap">{count}</span>
          </p>
        </div>
        <DialogCloseCircle size={40} />
      </header>
      <div className={SCROLL}>
        <div className="md:pt-2">
          <CastSheetList total={total} />
        </div>
      </div>
    </ModalShell>
  );
}
