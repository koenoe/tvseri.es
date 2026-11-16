'use client';

import type { ReactNode } from 'react';

import { useAdminState } from '../admin/adminStore';

/**
 * The hero's grid. While the admin image tray is open for this show it docks
 * the title, facts and progress right above the tray and hides the
 * description and the actions ("the real hero, live"); the
 * `data-docked` attribute drives that in CSS, so the server markup stays the
 * same for everyone and nothing re-renders.
 */
export default function HeroGrid({
  children,
  seriesId,
}: Readonly<{ children: ReactNode; seriesId: number }>) {
  const docked = useAdminState((state) => state.request?.seriesId === seriesId);
  return (
    <div
      className="group/hero relative mx-auto grid max-w-page grid-cols-1 grid-rows-[1fr_auto] px-gutter"
      data-docked={docked ? '' : undefined}
    >
      {children}
    </div>
  );
}
