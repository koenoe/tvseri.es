import type { ReactNode } from 'react';

import Button from '@/components/ui/button/Button';

import { SM_BUTTON } from '../../_lib/appButtons';

/** The inline confirm under a destructive action. */
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
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-12 bg-white/5 p-4 text-meta text-white/80"
      role="group"
    >
      <p className="min-w-55 flex-1">{children}</p>
      <Button className={SM_BUTTON} onClick={onCancel} variant="quiet">
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
