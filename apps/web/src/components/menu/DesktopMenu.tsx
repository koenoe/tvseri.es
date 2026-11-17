'use client';

import * as m from 'motion/react-m';

import {
  SIDE_MOTION,
  SIDE_SCRIM_MOTION,
  toVariants,
} from '@/components/ui/dialog/dialogMotion';
import { BACKDROP } from '@/components/ui/dialog/dialogStyles';
import cn from '@/lib/cn';

import MenuGroups, { type MenuLook } from './MenuGroups';
import type { MenuModel } from './menuItems';
import { ACCOUNT_WORD, GROUP_LABEL, MARKED_WORD, MENU_GLASS } from './menuLook';
import { panelListVariants } from './menuMotion';

// The side panels' one motion and dim (with the watch-history sheet)
const PANEL_VARIANTS = toVariants(SIDE_MOTION);
const SCRIM_VARIANTS = toVariants(SIDE_SCRIM_MOTION);

// Hover shows the rule at 45%, without the step
const HOVER_RULE =
  'before:transition-opacity before:duration-150 hover:before:opacity-45';

/* sizes at 1024 and 1440 */
const PANEL_LOOK: MenuLook = {
  account: 'mt-auto flex gap-6 border-t border-white/14 pointer-events-auto',
  accountItem: ACCOUNT_WORD,
  label: cn(GROUP_LABEL, 'mb-1'),
  laterLabel: cn(GROUP_LABEL, 'mt-7 mb-1'),
  listVariants: panelListVariants,
  note: 'mt-1.5 text-[14px] leading-5 text-white/70',
  page: cn(
    MARKED_WORD,
    HOVER_RULE,
    'min-h-11 text-[24px] leading-8 font-medium tracking-[-0.005em]',
  ),
  word: cn(
    MARKED_WORD,
    HOVER_RULE,
    'min-h-14 text-[40px] leading-12 font-semibold tracking-[-0.015em]',
  ),
};

/**
 * The desktop menu: a glass panel the
 * full height of the window, flush with its right edge, under the header
 * (380px wide, 420px from 1280). The words start 120px down, the account
 * line sits at the bottom. It behaves as every desktop side panel does (the
 * watch-history sheet): the page becomes a dimmed
 * (`BACKDROP.side`), inert, scroll-locked background, the panel slides in and
 * out (`SIDE_MOTION`), and a click on the dimmed page closes it. The header
 * stays above it, live (the menu's toggle is its ✕).
 */
const DIM = cn('fixed inset-0', BACKDROP.side);

const PANEL = cn(
  'fixed inset-y-0 right-0 flex w-[380px] flex-col pt-[120px] pr-12 pb-7 pl-14 shadow-[-1px_0_0_rgb(255_255_255/0.1),-24px_0_48px_rgb(0_0_0/0.28)] xl:w-[420px]',
  MENU_GLASS,
);

export default function DesktopMenu({
  model,
  onClose,
}: Readonly<{ model: MenuModel; onClose: () => void }>) {
  return (
    <>
      <m.div
        className={DIM}
        data-menu-dim=""
        onClick={onClose}
        variants={SCRIM_VARIANTS}
      />
      <m.div className={PANEL} data-menu-panel="" variants={PANEL_VARIANTS}>
        <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
          <MenuGroups look={PANEL_LOOK} model={model} onNavigate={onClose} />
        </nav>
      </m.div>
    </>
  );
}
