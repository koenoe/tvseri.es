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
 * top corners, the grab handle; it swipes down to close), from md a 440px
 * side panel the full height on the right, as every side panel slides in.
 */
const PANEL = cn(
  'flex flex-col',
  SURFACE.sheet,
  SHADOW.sheet,
  'max-md:h-[80dvh] max-md:w-full max-md:self-end max-md:rounded-t-[24px] max-md:px-gutter max-md:pt-2.5 max-md:shadow-[0_-20px_40px_rgb(0_0_0/0.4)]',
  'md:h-dvh md:w-110 md:max-w-full md:self-stretch md:justify-self-end md:border-white/8 md:border-l',
);

const HEADER =
  'flex shrink-0 items-center justify-between gap-3 max-md:mb-1 max-md:h-9 md:h-19 md:border-white/8 md:border-b md:pr-6 md:pl-8';

const TITLE = 'font-semibold text-[17px] leading-6 md:text-[20px] md:leading-7';

/** The show and the count: the side panel's second line (white/60, the app's contrast floor); the sheet has none */
const SUBTITLE =
  'mt-0.5 text-[13px] text-white/60 leading-[18px] max-md:hidden';

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
  const subtitle = `${title} · ${peopleCount(total)}`;
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
          <p className={SUBTITLE}>{subtitle}</p>
        </div>
        <DialogCloseCircle size={40} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 md:px-8 md:pt-2">
        <CastSheetList total={total} />
      </div>
    </ModalShell>
  );
}
