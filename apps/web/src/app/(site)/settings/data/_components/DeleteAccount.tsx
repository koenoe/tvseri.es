'use client';

import { useCallback, useState } from 'react';

import Button from '@/components/ui/button/Button';
import { trashGlyph } from '@/components/ui/icon/glyphs';

import { DANGER_BUTTON, MD_BUTTON } from '../../_lib/appButtons';

const CLASSES = `${DANGER_BUTTON} ${MD_BUTTON}`;

import { DataCard, DataRow } from './DataCard';
import DeleteDialog from './DeleteDialog';
import DeletedNotice from './DeletedNotice';

/**
 * Delete account: muted red, only here. The row opens the confirm
 * dialog; the account is deleted only after the username is typed.
 */
export default function DeleteAccount({
  episodes,
  username,
}: Readonly<{ episodes: number | null; username: string }>) {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const askDelete = useCallback(() => setOpen(true), []);
  const onDeleted = useCallback(() => {
    setOpen(false);
    setDeleted(true);
  }, []);

  if (deleted) {
    return <DeletedNotice />;
  }
  const action = (
    <Button
      className={CLASSES}
      icon={trashGlyph}
      onClick={askDelete}
      variant="tonal"
    >
      Delete account
    </Button>
  );
  return (
    <>
      <DataCard danger dot="bg-danger" title="Delete account">
        <DataRow action={action} title="Delete everything">
          Your profile, history, lists and Plex link. This can’t be undone.
        </DataRow>
      </DataCard>
      <DeleteDialog
        episodes={episodes}
        onDeleted={onDeleted}
        onOpenChange={setOpen}
        open={open}
        username={username}
      />
    </>
  );
}
