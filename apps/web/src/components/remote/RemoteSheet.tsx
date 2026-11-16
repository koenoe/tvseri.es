'use client';

import { type ReactNode, useId } from 'react';

import { PHONE_MOTION } from '@/components/ui/dialog/dialogMotion';
import ModalShell from '@/components/ui/dialog/ModalShell';
import SheetHandle from '@/components/ui/dialog/SheetHandle';

/** white, 16 16 0 0, 8 16 34 padding, its own shadow. */
const SHEET =
  'w-full self-end bg-white rounded-t-16 px-gutter pt-2 pb-8.5 shadow-[0_-20px_40px_-12px_rgb(0_0_0/0.5)]!';

/** `.rk-dim`: the page colour at 40% (the tile's ink when it has one). */
const DIM =
  'bg-[color-mix(in_srgb,var(--remote-ink,var(--color-page))_40%,transparent)]';

/**
 * Phones (< 768px): the Remote as a modal bottom sheet on the shared
 * `<dialog>` shell (focus trap, Escape, the dim closes, focus returns to the
 * ⋯), sliding up 24px with a fade over 240 ms.
 */
export default function RemoteSheet({
  children,
  label,
  onOpenChange,
  open,
}: Readonly<{
  children: ReactNode;
  label: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}>) {
  const titleId = useId();
  return (
    <ModalShell
      backdropClassName={DIM}
      labelledBy={titleId}
      motion={PHONE_MOTION}
      onOpenChange={onOpenChange}
      open={open}
      panelClassName={SHEET}
    >
      <h2 className="sr-only" id={titleId}>
        {label}
      </h2>
      <SheetHandle className="mx-auto mb-3" tone="light" />
      {children}
    </ModalShell>
  );
}
