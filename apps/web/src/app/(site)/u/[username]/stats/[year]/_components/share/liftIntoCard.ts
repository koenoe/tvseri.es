import { flushSync } from 'react-dom';

import { motionWelcome } from '@/lib/media/motionWelcome';

/** The pair's name: the glance before the open, the card's frame after */
const NAME = 'year-card';

/**
 * Opens the share dialog with the year you just read lifting into the
 * card's frame (`data-share-source` → `data-share-frame`): one view
 * transition around the open, the browser's, not a navigation. The old
 * picture is taken before `open` runs, so the dialog (top layer, from
 * `showModal`) is drawn in the new one; `open` renders at once inside it
 * (`flushSync`) and needs the dialog's code already in. Each element
 * carries the name only for its own side, so the two are never named at
 * once; the frame lets go when it has landed. Lands on the frame's ground
 * when the card image isn't in yet. With reduced motion, on a slow device
 * or without view transitions: just opens.
 */
export function liftIntoCard(from: Element, open: () => void): void {
  const source = from.closest<HTMLElement>('[data-share-source]');
  if (
    !source ||
    typeof document.startViewTransition !== 'function' ||
    !motionWelcome()
  ) {
    open();
    return;
  }
  source.style.viewTransitionName = NAME;
  let frame: HTMLElement | null = null;
  const transition = document.startViewTransition(() => {
    source.style.viewTransitionName = '';
    flushSync(open);
    frame = document.querySelector<HTMLElement>(
      'dialog[open] [data-share-frame]',
    );
    if (frame) {
      frame.style.viewTransitionName = NAME;
    }
  });
  const letGo = () => {
    source.style.viewTransitionName = '';
    if (frame) {
      frame.style.viewTransitionName = '';
    }
  };
  transition.finished.then(letGo, letGo);
}
