'use client';

import { AnimatePresence } from 'motion/react';
import { type ReactNode, useLayoutEffect, useRef } from 'react';

import FoldPresence from '@/components/motion/FoldPresence';

import { focusLaneHeading } from '../../blocks/rowFocus';
import { UP_NEXT_HEADING } from '../up-next/upNextHeading';

/**
 * The card takes the column's 48px gap below it with it as it folds (the
 * Up next hole's `gap-12`): it draws the gap itself and gives the column's
 * back, so Up next closes up without a jump.
 */
const FOLD = '-mb-12';
const GAP = 'pb-12';

/**
 * Get started at the top of your profile: it folds away once its last step
 * is done (the owner's choice, 20 Nov: the lanes below rise into its place
 * rather than jump). It shows the card as it was before that last step
 * while it goes. That step is done inside the card (a service chip, a
 * poster), so focus held there moves to Up next's heading as it starts to
 * fold, before it turns inert. Nothing moves on the first render.
 */
export default function GetStartedFold({
  children,
  done,
}: Readonly<{ children: ReactNode; done: boolean }>) {
  const card = useRef<HTMLDivElement>(null);
  // in the commit that makes it inert, before focus falls to the page
  useLayoutEffect(() => {
    if (done && card.current?.contains(document.activeElement)) {
      focusLaneHeading(document.getElementById(UP_NEXT_HEADING));
    }
  }, [done]);
  return (
    <AnimatePresence initial={false}>
      {done ? null : (
        <FoldPresence className={FOLD} key="get-started">
          <div className={GAP} ref={card}>
            {children}
          </div>
        </FoldPresence>
      )}
    </AnimatePresence>
  );
}
