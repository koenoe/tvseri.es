'use client';

import { useId } from 'react';
import { PHONE_MOTION } from '@/components/ui/dialog/dialogMotion';
import { BACKDROP } from '@/components/ui/dialog/dialogStyles';
import ModalShell from '@/components/ui/dialog/ModalShell';
import SheetHandle from '@/components/ui/dialog/SheetHandle';

import type { ControlStatesRead } from '@/lib/marking/controlState';

import type { LandscapeShow } from '../_data/landscape';
import { DecadeCardActions, DecadeCardText } from './DecadeCard';

// The phone sheet: #24262c, 24px top corners, 12 16 40, the grab handle
// (it swipes down to close; the dim and Escape close it too)
const PANEL =
  'flex w-full flex-col items-start self-end rounded-t-[24px] bg-[#24262c] px-gutter pt-3 pb-10 shadow-[0_-12px_40px_rgb(0_0_0/0.5)]';

type Props = Readonly<{
  onOpenChange: (open: boolean) => void;
  open: boolean;
  show: LandscapeShow;
  states: ControlStatesRead;
}>;

/**
 * The phone's card: the same card as desktop's, in
 * a bottom sheet over a dim, on the shared modal shell (focus trap,
 * Escape, the backdrop closes it, focus returns to the row), sliding up as
 * every phone sheet does (`PHONE_MOTION`). Loaded on the first tap
 * (`DecadeLandscape`).
 */
export default function DecadeSheet({
  onOpenChange,
  open,
  show,
  states,
}: Props) {
  const titleId = useId();
  return (
    <ModalShell
      backdropClassName={BACKDROP.dialog}
      labelledBy={titleId}
      motion={PHONE_MOTION}
      onOpenChange={onOpenChange}
      open={open}
      panelClassName={PANEL}
    >
      <SheetHandle className="mb-3 self-center" />
      <DecadeCardText show={show} titleId={titleId} />
      <div className="mt-6">
        <DecadeCardActions show={show} states={states} />
      </div>
    </ModalShell>
  );
}
