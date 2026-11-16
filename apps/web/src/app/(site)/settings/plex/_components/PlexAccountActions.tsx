'use client';

import { useState, useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { closeGlyph, historyGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';
import { DANGER_BUTTON, MD_BUTTON, SM_BUTTON } from '../../_lib/appButtons';
import { PLEX_ERROR_TEXT } from '../_lib/plexCopy';
import { createPlexUrl, disconnectPlex } from '../actions';
import ConfirmRow from './ConfirmRow';

type Ask = 'regen' | 'revoke' | null;

/**
 * New URL and Disconnect, each behind its own confirm row. Both act on the signed-in user's link only: they send nothing
 * but the session.
 */
const DANGER_CLASSES = `${DANGER_BUTTON} ${MD_BUTTON}`;

export default function PlexAccountActions({
  onDisconnected,
  onRegenerated,
}: Readonly<{ onDisconnected: () => void; onRegenerated: () => void }>) {
  const [ask, setAsk] = useState<Ask>(null);
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
      setAsk(null);
      onDone();
      showToast({ title: done });
    });

  const askRegen = () => setAsk('regen');
  const askRevoke = () => setAsk('revoke');
  const cancel = () => setAsk(null);
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
          variant="tonal"
        >
          New URL
        </Button>
        <Button
          className={DANGER_CLASSES}
          icon={closeGlyph}
          onClick={askRevoke}
          variant="tonal"
        >
          Disconnect
        </Button>
      </div>
      {ask === 'regen' ? (
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
      {ask === 'revoke' ? (
        <ConfirmRow
          confirm="Disconnect Plex"
          confirmClassName={`${SM_BUTTON} ${DANGER_BUTTON}`}
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
