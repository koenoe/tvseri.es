'use client';

import * as m from 'motion/react-m';
import { useRef } from 'react';

import cn from '@/lib/cn';

import MenuGroups, { type MenuLook } from './MenuGroups';
import type { MenuModel } from './menuItems';
import {
  ACCOUNT_WORD,
  GROUP_LABEL,
  MARKED_WORD,
  PHONE_DIM,
  PHONE_GLASS,
} from './menuLook';
import { phoneGlassVariants, phoneWordVariants } from './menuMotion';
import useSwipeToClose from './useSwipeToClose';

/* sizes at 390; the dimmed text at white/80 over the lighter glass */
const PHONE_LOOK: MenuLook = {
  account:
    'mt-3.5 flex gap-[22px] border-t border-white/14 pt-0.5 pointer-events-auto',
  accountItem: cn(ACCOUNT_WORD, PHONE_DIM, 'aria-[current=page]:text-white'),
  label: cn(GROUP_LABEL, PHONE_DIM, 'mt-[18px] mb-0.5'),
  laterLabel: cn(GROUP_LABEL, PHONE_DIM, 'mt-[18px] mb-0.5'),
  note: cn('mt-1 text-[13px] leading-[18px]', PHONE_DIM),
  page: cn(MARKED_WORD, 'min-h-11 text-[24px] leading-8 font-medium'),
  word: cn(
    MARKED_WORD,
    'min-h-[52px] text-[36px] leading-[44px] font-semibold tracking-[-0.015em]',
  ),
  wordVariants: phoneWordVariants,
};

/**
 * The phone menu: the glass spreads over the whole screen and
 * the grouped words stand at the bottom, by the thumb, on the page gutter.
 * The header stays above it as the transparent bar. A tap on the glass
 * (anywhere but a word) or a swipe down closes it.
 */
export default function MobileMenu({
  model,
  onClose,
}: Readonly<{ model: MenuModel; onClose: () => void }>) {
  const nav = useRef<HTMLElement>(null);
  const swipe = useSwipeToClose(nav, onClose);

  return (
    <div className="fixed inset-0 touch-none" {...swipe}>
      <m.div
        className={cn('absolute inset-0', PHONE_GLASS)}
        data-menu-glass=""
        onClick={onClose}
        variants={phoneGlassVariants}
      />
      <nav
        aria-label="Main"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col px-gutter pb-[calc(16px+env(safe-area-inset-bottom))]"
        ref={nav}
      >
        <MenuGroups look={PHONE_LOOK} model={model} onNavigate={onClose} />
      </nav>
    </div>
  );
}
