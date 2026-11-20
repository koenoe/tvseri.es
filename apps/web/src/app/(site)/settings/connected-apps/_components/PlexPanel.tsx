'use client';

import { AnimatePresence } from 'motion/react';
import { type ReactNode, useEffect } from 'react';

import { readDisplayUsername } from '@/auth/displayUsername';
import AppTile from '@/components/brand/AppTile';
import FoldPresence from '@/components/motion/FoldPresence';
import SwapIn from '@/components/motion/SwapIn';
import { PLEX_BRAND } from '../../_lib/plexBrand';
import { plexStateFrom } from '../../_lib/plexState';
import {
  appSurface,
  isLive as isLiveState,
  plexLook,
  statePill,
} from '../_lib/appState';
import type { PlexPanelStatus } from '../_lib/plexCard';
import { plexSteps } from '../_lib/plexCopy';
import { persistPlexHint } from '../_lib/plexHint';
import AppCard from './AppCard';
import AppHeader from './AppHeader';
import AppPill from './AppPill';
import { AppBody, AppToggle } from './AppsAccordion';
import CreatePlexUrl from './CreatePlexUrl';
import { BODY_STACK_CLASS } from './layout';
import PlexAccountActions from './PlexAccountActions';
import PlexOptions from './PlexOptions';
import PlexStatusLine from './PlexStatusLine';
import SetupSteps from './SetupSteps';
import UrlField from './UrlField';
import usePlexSettings from './usePlexSettings';
import usePlexUrl from './usePlexUrl';

/**
 * The first scrobble folds the live activity in as the waiting steps fold
 * out. Each fold takes the body's 16px gap back and draws it itself
 * (`pt-4`). The activity is two
 * parts (the panel and its list), spaced as the body spaces them.
 */
const PART_FOLD = '-mt-4';
const PART_GAP = 'pt-4';
const ACTIVITY_GAP = 'flex flex-col gap-4 pt-4';

/**
 * The Plex card's client half. The server hands over the status and the
 * Last scrobble card (never the token: Show and Copy fetch it); this owns
 * what changes on a tap.
 */
export default function PlexPanel({
  account,
  connected,
  hasUrl,
  lastReceivedAt,
  onlyAccountId,
  paused,
  prefix,
  scrobbles,
  urlWorks,
}: PlexPanelStatus &
  Readonly<{
    /** The URL up to the token */
    prefix: string;
    /** The Last scrobble card with its week, and the list under it (server-rendered) */
    scrobbles: ReactNode;
  }>) {
  const settings = usePlexSettings({ onlyAccountId, paused });
  const url = usePlexUrl();
  const state = plexStateFrom(
    connected,
    settings.paused,
    lastReceivedAt !== null,
    urlWorks,
  );
  // The card's colour, pill and placeholder: a pause before anything
  // arrived looks like waiting (the status line still says Paused)
  const look = plexLook(state, lastReceivedAt !== null);
  const isLive = isLiveState(look);
  const surface = appSurface(look);
  const stage = state === 'none' ? 'setup' : 'connected';

  // The next hard load's placeholder takes this shape; it's a browser
  // store, so an effect writes it
  useEffect(() => {
    persistPlexHint(readDisplayUsername(document.cookie), look);
  }, [look]);

  const pills = (
    <>
      <AppPill brand="plex" variant={surface}>
        {statePill(look)}
      </AppPill>
      {PLEX_BRAND.facts.map((fact) => (
        <AppPill brand="plex" key={fact}>
          {fact}
        </AppPill>
      ))}
    </>
  );
  const status = (
    <PlexStatusLine lastReceivedAt={lastReceivedAt} state={state} />
  );

  return (
    <AppCard brand="plex" surface={surface}>
      <AppHeader
        name="Plex"
        pills={pills}
        status={status}
        tile={<AppTile app="plex" />}
      >
        <AppToggle app="plex" name="Plex" />
      </AppHeader>
      <AppBody app="plex">
        {/* Setting up and connected replace each other in place, as a
            streaming service's stages do */}
        <SwapIn className={BODY_STACK_CLASS} swapKey={stage}>
          {stage === 'setup' ? (
            <>
              <SetupSteps lines={plexSteps(false)} />
              <CreatePlexUrl />
            </>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {isLive && scrobbles ? (
                  <FoldPresence className={PART_FOLD} key="activity">
                    <div className={ACTIVITY_GAP}>{scrobbles}</div>
                  </FoldPresence>
                ) : null}
              </AnimatePresence>
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
              <AnimatePresence initial={false}>
                {look === 'wait' || look === 'broken' ? (
                  <FoldPresence className={PART_FOLD} key="steps">
                    <div className={PART_GAP}>
                      <SetupSteps lines={plexSteps(true)} />
                    </div>
                  </FoldPresence>
                ) : null}
              </AnimatePresence>
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
        </SwapIn>
      </AppBody>
    </AppCard>
  );
}
