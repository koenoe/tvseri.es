'use client';

import { AnimatePresence } from 'motion/react';
import { useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { closeGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';
import { DANGER_BUTTON, MD_BUTTON, SM_BUTTON } from '../../_lib/appButtons';
import { appErrorText } from '../_lib/appState';
import { disconnectConnection } from '../actions';
import ConfirmRow from './ConfirmRow';
import { useConnectedService } from './ServiceContext';
import useConfirm from './useConfirm';

const DANGER_CLASSES = `${DANGER_BUTTON} ${MD_BUTTON}`;
const DISCONNECT_CLASSES = `${SM_BUTTON} ${DANGER_BUTTON}`;

/** Disconnect, behind the same confirm row as Plex's. */
export default function ServiceAccountActions({
  onDisconnected,
}: Readonly<{ onDisconnected: () => void }>) {
  const { id, name } = useConnectedService();
  const { ask, asking, cancel, close, trigger } = useConfirm<'disconnect'>();
  const [pending, startTransition] = useTransition();
  const confirm = `Disconnect ${name}`;
  const warning = `Your ${name} history stops syncing here. What’s already marked stays.`;
  const askDisconnect = () => ask('disconnect');
  const disconnectTrigger = trigger('disconnect');
  const disconnect = () =>
    startTransition(async () => {
      const result = await disconnectConnection(id);
      if (!result.ok) {
        showToast({ title: appErrorText(name)[result.error], tone: 'error' });
        return;
      }
      close();
      onDisconnected();
      showToast({ title: `${name} disconnected: nothing more syncs` });
    });
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className={DANGER_CLASSES}
          icon={closeGlyph}
          onClick={askDisconnect}
          ref={disconnectTrigger}
          variant="tonal"
        >
          Disconnect
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {asking === 'disconnect' ? (
          <ConfirmRow
            confirm={confirm}
            confirmClassName={DISCONNECT_CLASSES}
            key="disconnect"
            onCancel={cancel}
            onConfirm={disconnect}
            pending={pending}
          >
            {warning}
          </ConfirmRow>
        ) : null}
      </AnimatePresence>
    </>
  );
}
