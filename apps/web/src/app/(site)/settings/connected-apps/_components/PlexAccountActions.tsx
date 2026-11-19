'use client';

import { useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { closeGlyph, historyGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';
import { DANGER_BUTTON, MD_BUTTON, SM_BUTTON } from '../../_lib/appButtons';
import { PLEX_ERROR_TEXT } from '../_lib/plexCopy';
import { createPlexUrl, disconnectPlex } from '../actions';
import ConfirmRow from './ConfirmRow';
import useConfirm from './useConfirm';

/** New URL and Disconnect, each behind its own confirm row */
const DANGER_CLASSES = `${DANGER_BUTTON} ${MD_BUTTON}`;
const DISCONNECT_CLASSES = `${SM_BUTTON} ${DANGER_BUTTON}`;

export default function PlexAccountActions({
  onDisconnected,
  onRegenerated,
}: Readonly<{ onDisconnected: () => void; onRegenerated: () => void }>) {
  const { ask, asking, cancel, close, trigger } = useConfirm<
    'regen' | 'revoke'
  >();
  const [pending, startTransition] = useTransition();

  const run = (
    action: typeof createPlexUrl,
    done: string,
    onDone: () => void,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        showToast({ title: PLEX_ERROR_TEXT[result.error], tone: 'error' });
        return;
      }
      close();
      onDone();
      showToast({ title: done });
    });

  const askRegen = () => ask('regen');
  const askRevoke = () => ask('revoke');
  const regenTrigger = trigger('regen');
  const revokeTrigger = trigger('revoke');
  const regen = () =>
    run(
      createPlexUrl,
      'New URL created: paste it into Plex. It works within a minute.',
      onRegenerated,
    );
  const revoke = () =>
    run(
      disconnectPlex,
      'Plex disconnected: the URL no longer works',
      onDisconnected,
    );
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className={MD_BUTTON}
          icon={historyGlyph}
          onClick={askRegen}
          ref={regenTrigger}
          variant="tonal"
        >
          New URL
        </Button>
        <Button
          className={DANGER_CLASSES}
          icon={closeGlyph}
          onClick={askRevoke}
          ref={revokeTrigger}
          variant="tonal"
        >
          Disconnect
        </Button>
      </div>
      {asking === 'regen' ? (
        <ConfirmRow
          confirm="Create a new URL"
          onCancel={cancel}
          onConfirm={regen}
          pending={pending}
        >
          Your current URL stops working straight away. You’ll paste the new one
          into Plex.
        </ConfirmRow>
      ) : null}
      {asking === 'revoke' ? (
        <ConfirmRow
          confirm="Disconnect Plex"
          confirmClassName={DISCONNECT_CLASSES}
          onCancel={cancel}
          onConfirm={revoke}
          pending={pending}
        >
          Plex stops marking episodes here. What’s already marked stays.
        </ConfirmRow>
      ) : null}
    </>
  );
}
