import { type ReactNode, useId } from 'react';

import Button from '@/components/ui/button/Button';

import { SM_BUTTON } from '../../_lib/appButtons';

// The trigger leaves or stays behind; Cancel is the safe place for focus
const focusOnMount = (node: HTMLElement | null) => node?.focus();

/**
 * The inline confirm under a destructive action. Focus opens on Cancel and
 * the group is named by its question, so both are announced. Pair it with
 * `useConfirm`, whose `cancel` hands focus back to the trigger.
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
  return (
    <div
      aria-labelledby={questionId}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-12 bg-white/5 p-4 text-meta text-white/80"
      role="group"
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
    </div>
  );
}
