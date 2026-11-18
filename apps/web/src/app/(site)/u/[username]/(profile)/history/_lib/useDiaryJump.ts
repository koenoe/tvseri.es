'use client';

import { useRouter } from 'next/navigation';
import { type MouseEvent, startTransition, useCallback } from 'react';

import { isPlainClick } from '@/lib/navigation/isPlainClick';

import { setJumping } from './activeMonth';

/** The diary's top edge sits this far down after a jump: clear of the floating header pill */
const TOP_CLEARANCE = 96;

/** An instant scroll to the top of the diary (never smooth) */
export function scrollToDiaryTop() {
  const diary = document.querySelector('[data-diary]');
  if (!diary) {
    return;
  }
  const top = diary.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    behavior: 'instant',
    top: Math.max(0, top - TOP_CLEARANCE),
  });
}

/**
 * Jump to's links: a plain click pushes the month's URL in a transition
 * (the old list stays, fading out, until the new one lands; Back returns),
 * without Next's own scroll; the diary scrolls to its top when the new list
 * lands. The URL already open only scrolls to the top. Other clicks (a new
 * tab) are the link's own.
 */
export function useDiaryJump() {
  const router = useRouter();
  return useCallback(
    (event: MouseEvent<HTMLAnchorElement>, onPick?: () => void) => {
      if (!isPlainClick(event)) {
        return;
      }
      event.preventDefault();
      onPick?.();
      const href = event.currentTarget.getAttribute('href') ?? '';
      if (href === `${window.location.pathname}${window.location.search}`) {
        scrollToDiaryTop();
        return;
      }
      setJumping(true);
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [router],
  );
}
