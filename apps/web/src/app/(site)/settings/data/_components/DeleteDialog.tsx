'use client';

import {
  type ChangeEvent,
  type KeyboardEvent,
  useId,
  useState,
  useTransition,
} from 'react';

import Button from '@/components/ui/button/Button';
import {
  Dialog,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog/Dialog';

import InputShell, { INPUT_CLASS } from '../../_components/InputShell';
import { DANGER_FILLED_BUTTON } from '../../_lib/appButtons';
import { deleteDialogText, deleteErrorText } from '../_lib/deleteCopy';
import { deleteAccount } from '../actions';

/** Ends the session after the deletion: the logout route also revokes the refresh token. */
const signOut = () =>
  fetch('/api/auth/logout', { method: 'POST', redirect: 'manual' }).catch(
    () => null,
  );

/**
 * The confirm dialog (a bottom sheet on phones): the
 * username has to be typed before Delete my account turns on. The typed text
 * is only a confirmation: the action checks it against the session's own
 * username and deletes that account, nobody else's.
 */
export default function DeleteDialog({
  episodes,
  onDeleted,
  onOpenChange,
  open,
  username,
}: Readonly<{
  episodes: number | null;
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  username: string;
}>) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canDelete = typed.trim() === username;

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    setTyped(event.target.value);
    setError(null);
  };
  const openChange = (next: boolean) => {
    if (!next) {
      setTyped('');
      setError(null);
    }
    onOpenChange(next);
  };
  const confirm = () => {
    if (!canDelete) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAccount(typed);
      if (result.ok) {
        await signOut();
        onDeleted();
        return;
      }
      setError(deleteErrorText(result.error));
    });
  };

  // Enter in the field is the button, once the name is right
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  };
  const description = deleteDialogText(episodes);
  const deleteBlocked = !canDelete;

  return (
    <Dialog
      description={description}
      onOpenChange={openChange}
      open={open}
      title="Delete your account?"
      variant="plain"
    >
      <label className="flex flex-col gap-2" htmlFor={inputId}>
        <span className="text-body-sm font-semibold">
          Type {username} to confirm
        </span>
        <InputShell className="h-12 px-4">
          <input
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className={INPUT_CLASS}
            id={inputId}
            onChange={change}
            onKeyDown={keyDown}
            spellCheck={false}
            type="text"
            value={typed}
          />
        </InputShell>
      </label>
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <DialogClose>Cancel</DialogClose>
        <Button
          aria-disabled={deleteBlocked}
          className={DANGER_FILLED_BUTTON}
          onClick={confirm}
          pending={pending}
          variant="tonal"
        >
          Delete my account
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
