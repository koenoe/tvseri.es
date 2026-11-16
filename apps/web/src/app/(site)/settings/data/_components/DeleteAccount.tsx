'use client';

import { useCallback, useState } from 'react';

import Button from '@/components/ui/button/Button';
import { trashGlyph } from '@/components/ui/icon/glyphs';

import { DANGER_BUTTON, MD_BUTTON } from '../../_lib/appButtons';

const CLASSES = `${DANGER_BUTTON} ${MD_BUTTON}`;

import { deleteErrorText } from '../_lib/deleteCopy';
import { DataCard, DataRow } from './DataCard';
import DeleteDialog from './DeleteDialog';
import DeletedNotice from './DeletedNotice';

/**
 * Delete account: muted red, only here. The row opens the confirm
 * dialog; the account is deleted only after the username is typed. While the
 * API has deleting switched off (its 403), the card and dialog keep the flow
 * and say so, with the button off.
 */
export default function DeleteAccount({
  episodes,
  username,
}: Readonly<{ episodes: number | null; username: string }>) {
  const [open, setOpen] = useState(false);
  const [notEnabled, setNotEnabled] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const askDelete = useCallback(() => setOpen(true), []);
  const onDeleted = useCallback(() => {
    setOpen(false);
    setDeleted(true);
  }, []);
  const onNotEnabled = useCallback(() => setNotEnabled(true), []);

  if (deleted) {
    return <DeletedNotice />;
  }
  const action = (
    <Button
      aria-disabled={notEnabled}
      className={CLASSES}
      icon={trashGlyph}
      onClick={notEnabled ? undefined : askDelete}
      variant="tonal"
    >
      Delete account
    </Button>
  );
  return (
    <>
      <DataCard danger dot="bg-[#ff8f8f]" title="Delete account">
        <DataRow action={action} title="Delete everything">
          Your profile, history, lists and Plex link. This can’t be undone.
          {notEnabled ? ` ${deleteErrorText('not-enabled')}` : ''}
        </DataRow>
      </DataCard>
      <DeleteDialog
        episodes={episodes}
        notEnabled={notEnabled}
        onDeleted={onDeleted}
        onNotEnabled={onNotEnabled}
        onOpenChange={setOpen}
        open={open}
        username={username}
      />
    </>
  );
}
