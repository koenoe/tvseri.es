'use client';

import { useReducedMotion, type Variants } from 'motion/react';
import * as m from 'motion/react-m';
import { type ReactNode, useId, useState } from 'react';

import { SHEET_EASE } from '@/components/motion/ease';
import { PHONE_MOTION } from '@/components/ui/dialog/dialogMotion';
import { BACKDROP } from '@/components/ui/dialog/dialogStyles';
import ModalShell from '@/components/ui/dialog/ModalShell';
import SheetHandle from '@/components/ui/dialog/SheetHandle';

import type { CalendarDayModel } from '../_lib/calendarModel';
import DayHeader from './DayHeader';
import DayTickets from './DayTickets';

/** 28px corners, concentric with the 12px tickets 16px in */
const PANEL =
  'flex max-h-[calc(100dvh-48px)] w-full flex-col gap-3 self-end overflow-y-auto overscroll-contain rounded-[28px] bg-ground-deep px-4 pt-2.5 pb-6 shadow-[0_-1px_0_0_rgb(255_255_255/0.12),0_-30px_60px_-20px_rgb(0_0_0/0.9)]';

/** Opening a day is rare on a phone: its tickets rise one by one, once */
const LIST: Variants = { hidden: {}, visible: {} };
const STAGGER = { delayChildren: 0.08, staggerChildren: 0.06 } as const;
const RISE: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    transition: { duration: 0.24, ease: SHEET_EASE },
    y: 0,
  },
};

function Rise({ children }: Readonly<{ children: ReactNode }>) {
  return <m.div variants={RISE}>{children}</m.div>;
}

/**
 * The phone's day: a bottom sheet of the day's tickets, each a link to its
 * show. The app's sheet: it rises 24px in 240ms over a dim, swipes down to
 * close, and Esc, ✕ or the dim close it with focus back on the day.
 */
export default function DaySheet({
  day,
  now,
  onClose,
}: Readonly<{
  day: CalendarDayModel | null;
  now: number;
  onClose: () => void;
}>) {
  const titleId = useId();
  // the closing sheet keeps its day while it leaves
  const [kept, setKept] = useState(day);
  if (day && day !== kept) {
    setKept(day);
  }
  const reduced = useReducedMotion();
  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };
  const visible = {
    transition: reduced ? undefined : STAGGER,
  };
  const variants = { ...LIST, visible };
  return (
    <ModalShell
      backdropClassName={BACKDROP.dialog}
      labelledBy={titleId}
      motion={PHONE_MOTION}
      onOpenChange={onOpenChange}
      open={day !== null}
      panelClassName={PANEL}
      sheetBelow="md"
    >
      {kept ? (
        <>
          <SheetHandle className="self-center" />
          <DayHeader day={kept} onClose={onClose} titleId={titleId} />
          <m.div
            animate="visible"
            className="flex flex-col gap-3"
            initial="hidden"
            variants={variants}
          >
            <DayTickets day={kept} Item={Rise} now={now} />
          </m.div>
        </>
      ) : null}
    </ModalShell>
  );
}
