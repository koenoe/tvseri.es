'use client';

import type { ScrobbleAccount } from '@tvseri.es/schemas';
import { type ReactNode, useEffect } from 'react';

import { readDisplayUsername } from '@/auth/displayUsername';

import { plexStateFrom } from '../../_lib/plexState';
import { persistPlexHint } from '../_lib/plexHint';
import AppCard from './AppCard';
import AppHeader from './AppHeader';
import AppPill from './AppPill';
import { AppBody, AppToggle } from './AppsAccordion';
import AppTile from './AppTile';
import CreatePlexUrl from './CreatePlexUrl';
import PlexAccountActions from './PlexAccountActions';
import PlexOptions from './PlexOptions';
import PlexStatusLine from './PlexStatusLine';
import SetupSteps from './SetupSteps';
import UrlField from './UrlField';
import usePlexSettings from './usePlexSettings';
import usePlexUrl from './usePlexUrl';

/**
 * The Plex card in its four states: not connected,
 * waiting for the first scrobble, receiving, paused. The server hands over
 * the status and the Last scrobble card with its list (never the token: Show and Copy
 * fetch it); this owns what changes
 * on a tap (pause and whose plays count are optimistic, the URL's visibility,
 * the confirm rows).
 */
export default function PlexPanel({
  account,
  connected,
  hasUrl,
  lastReceivedAt,
  onlyAccountId,
  paused,
  prefix,
  recentCount = 0,
  scrobbles,
  urlWorks = true,
}: Readonly<{
  /** The account "Only …" names: the saved one, else the last scrobble's */
  account: ScrobbleAccount | null;
  connected: boolean;
  /** A webhook URL exists (its token stays on the server until Show or Copy) */
  hasUrl: boolean;
  lastReceivedAt: number | null;
  onlyAccountId: number | null;
  paused: boolean;
  /** The URL up to the token */
  prefix: string;
  /** How many plays the Recent list shows */
  recentCount?: number;
  /** The Last scrobble card with its week, and the list under it (server-rendered) */
  scrobbles: ReactNode;
  /** False when the edge refuses the URL (the status's `urlWorks`) */
  urlWorks?: boolean;
}>) {
  const settings = usePlexSettings({ onlyAccountId, paused });
  const url = usePlexUrl();
  const state = plexStateFrom(
    connected,
    settings.paused,
    lastReceivedAt !== null,
    urlWorks,
  );
  const isLive = state === 'on' || state === 'paused';

  // The placeholder of the next hard load takes this shape (a browser store,
  // so an effect is the way to write it)
  useEffect(() => {
    persistPlexHint(readDisplayUsername(document.cookie), state, recentCount);
  }, [recentCount, state]);

  const pills = (
    <>
      <AppPill connected={isLive} tone="state">
        {isLive ? 'Connected' : 'Available'}
      </AppPill>
      <AppPill>Built in</AppPill>
      <AppPill>Needs Plex Pass</AppPill>
    </>
  );
  const status = (
    <PlexStatusLine lastReceivedAt={lastReceivedAt} state={state} />
  );

  return (
    <AppCard brand="plex" connected={isLive}>
      <AppHeader
        name="Plex"
        pills={pills}
        status={status}
        tile={<AppTile app="plex" />}
      >
        <AppToggle app="plex" closedLabel="Open" name="Plex" />
      </AppHeader>
      <AppBody app="plex">
        {state === 'none' ? (
          <>
            <SetupSteps hasUrl={false} />
            <CreatePlexUrl />
          </>
        ) : (
          <>
            {isLive ? scrobbles : null}
            {hasUrl ? (
              <UrlField
                connected={isLive}
                onCopy={url.copy}
                onToggle={url.toggle}
                pending={url.pending}
                prefix={prefix}
                url={url.shown}
              />
            ) : null}
            {state === 'wait' || state === 'broken' ? (
              <SetupSteps hasUrl />
            ) : null}
            <PlexOptions
              account={account}
              connected={isLive}
              onlyAccountId={settings.onlyAccountId}
              paused={settings.paused}
              setOnlyAccountId={settings.setOnlyAccountId}
              setPaused={settings.setPaused}
            />
            <PlexAccountActions
              onDisconnected={url.forget}
              onRegenerated={url.showFresh}
            />
          </>
        )}
      </AppBody>
    </AppCard>
  );
}
