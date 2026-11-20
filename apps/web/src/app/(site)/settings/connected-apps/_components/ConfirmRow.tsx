import { useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { type ReactNode, useId } from 'react';

import { appearFrom } from '@/components/motion/appear';
import Button from '@/components/ui/button/Button';
import { focusOnMount } from '@/lib/a11y/focusOnMount';

import { SM_BUTTON } from '../../_lib/appButtons';

/** A short drop in under the button that asked */
const MOTION = appearFrom({ y: -4 });

/**
 * The inline confirm under a destructive action. Focus opens on Cancel (the
 * trigger leaves or stays behind; Cancel is the safe place for it) and
 * the group is named by its question, so both are announced. Pair it with
 * `useConfirm`, whose `cancel` hands focus back to the trigger, and render
 * it in an `AnimatePresence` (sync mode: the trigger returns in the same
 * commit) so it fades out. Leaving, it can't be pressed twice. Its corners
 * are its 32px pills' plus its padding (16 + 16).
 */
export default function ConfirmRow({
  children,
  confirm,
  confirmClassName = SM_BUTTON,
  onCancel,
  onConfirm,
  pending,
}: Readonly<{
  children: ReactNode;
  confirm: string;
  confirmClassName?: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}>) {
  const questionId = useId();
  // Busy: Cancel can't undo a request already sent
  const cancel = pending ? undefined : onCancel;
  const busy = pending || undefined;
  const leaving = !useIsPresent();
  return (
    <m.div
      aria-labelledby={questionId}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[32px] bg-white/5 p-4 text-meta text-white/80"
      inert={leaving}
      role="group"
      {...MOTION}
    >
      <p className="min-w-55 flex-1" id={questionId}>
        {children}
      </p>
      <Button
        aria-disabled={busy}
        className={SM_BUTTON}
        onClick={cancel}
        ref={focusOnMount}
        variant="quiet"
      >
        Cancel
      </Button>
      <Button
        className={confirmClassName}
        onClick={onConfirm}
        pending={pending}
        variant="tonal"
      >
        {confirm}
      </Button>
    </m.div>
  );
}
