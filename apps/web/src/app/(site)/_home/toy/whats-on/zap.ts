'use client';

/**
 * The static flash between channels (HMFinal `e2-zp`, `e2zapa`): scan lines
 * from 85% to 0 in 300ms, ease-out, opacity only.
 */
export function zap(element: HTMLElement | null) {
  if (!element) {
    return;
  }
  element.animate([{ opacity: 0.85 }, { opacity: 0 }], {
    duration: 300,
    easing: 'ease-out',
  });
}
