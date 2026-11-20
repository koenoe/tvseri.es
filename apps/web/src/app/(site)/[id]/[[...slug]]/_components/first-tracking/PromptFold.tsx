'use client';

import { AnimatePresence, useIsPresent } from 'motion/react';
import type { ReactNode } from 'react';

import FoldPresence from '@/components/motion/FoldPresence';
import { FOCUSABLE } from '@/lib/a11y/focusable';

import { PROMPT_CELL, PROMPT_FRAME } from './PromptCard';

/**
 * The answer pressed leaves with the prompt: focus moves on to the next
 * control after it that takes focus (the synopsis' More, the hero's
 * actions; one hidden at this width doesn't), where Tab would have taken
 * it, rather than falling to the page
 */
const focusPastPrompt = (part: HTMLElement) => {
  if (!part.contains(document.activeElement)) {
    return;
  }
  for (const control of document.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    const after =
      !part.contains(control) &&
      Boolean(
        part.compareDocumentPosition(control) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    if (after) {
      control.focus({ preventScroll: true });
      if (document.activeElement === control) {
        return;
      }
    }
  }
};

/**
 * The fold clips while it moves: the card reaches 10px past the slot on
 * desktop (`md:-ml-2.5`) and rings itself outside its box, so the clip
 * reaches 12px out on both sides, the content staying where it was
 */
const FOLD_REACH = '-mx-3 px-3';

/** The frame the pre-paint hint hides; `data-leaving` while it folds away */
function PromptFrame({
  asking,
  children,
}: Readonly<{ asking: boolean; children: ReactNode }>) {
  const leaving = !useIsPresent();
  const ask = asking ? '' : undefined;
  const leavingMark = leaving ? '' : undefined;
  return (
    <div
      className={PROMPT_FRAME}
      data-ask={ask}
      data-leaving={leavingMark}
      data-prompt=""
    >
      <div className={PROMPT_CELL}>{children}</div>
    </div>
  );
}

/**
 * The prompt's place: drawn at once (it is in the static shell), and when
 * `gone` it folds shut like every part that leaves the flow
 * (`FoldPresence`), so what is below glides up; then it is removed and
 * `onGone` says so. Asked back while it folds, it opens again.
 */
export default function PromptFold({
  asking,
  children,
  gone,
  onGone,
}: Readonly<{
  /** The viewer's own marks say ask: the pre-paint hint can't hide it */
  asking: boolean;
  children: ReactNode;
  gone: boolean;
  /** It has folded away */
  onGone: () => void;
}>) {
  return (
    <AnimatePresence initial={false} onExitComplete={onGone}>
      {gone ? null : (
        <FoldPresence
          appear={false}
          className={FOLD_REACH}
          key="prompt"
          onLeave={focusPastPrompt}
        >
          <PromptFrame asking={asking}>{children}</PromptFrame>
        </FoldPresence>
      )}
    </AnimatePresence>
  );
}
