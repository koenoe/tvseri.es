'use client';

import type { ConnectionService } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';
import AppTile from '@/components/brand/AppTile';
import FlashRing from '@/components/motion/FlashRing';
import SwapIn from '@/components/motion/SwapIn';
import type { BrowserSupport } from '@/lib/extension/browserSupport';
import useExtension from '@/lib/extension/useExtension';
import { connectedService } from '../../_lib/services';
import { appSurface, statePill } from '../_lib/appState';
import type { ServiceCardStatus } from '../_lib/serviceCard';
import { serviceLook, serviceStateFrom } from '../_lib/serviceState';
import AppCard from './AppCard';
import AppHeader from './AppHeader';
import { PILL_GHOST } from './AppHeaderGhost';
import AppPill from './AppPill';
import { AppBody, AppToggle } from './AppsAccordion';
import { BODY_STACK_CLASS } from './layout';
import ServiceBody from './ServiceBody';
import { ServiceProvider } from './ServiceContext';
import ServicePairingBody from './ServicePairingBody';
import ServiceStatusLine from './ServiceStatusLine';
import useFirstSyncLanded from './useFirstSyncLanded';
import usePairing from './usePairing';

/**
 * The first sync's ring round the card: outside its clipped box, in its
 * corners, grown 2% (8% of a card this wide would reach the next one).
 * None with reduced motion, as `FlashTarget`'s
 */
const FIRST_SYNC_RING = 'rounded-[20px] motion-reduce:hidden';

/**
 * A streaming service card's client half. Colour means data is flowing, so
 * a fresh link stays neutral until the first sync. This owns the pairing,
 * whose polled link stands in until the server's status shows it.
 */
export default function ServicePanel({
  activity = null,
  syncNow = false,
  browser,
  review = null,
  service: id,
  status: loaded,
}: Readonly<{
  /** The live card's spotlight, week and list (server-rendered), once synced */
  activity?: ReactNode;
  /** Whether Sync now shows: the first sync, or an admin */
  syncNow?: boolean;
  /** Whether this browser can run the extension (from the request) */
  browser: BrowserSupport;
  /** The review list of entries the sync couldn't match (server-rendered) */
  review?: ReactNode;
  service: ConnectionService;
  status: ServiceCardStatus;
}>) {
  const service = connectedService(id);
  const signedOut = loaded.connected && loaded.status === 'signed-out';
  const landed = loaded.connected && loaded.status === 'ok';
  const extension = useExtension(id, !loaded.connected || signedOut, browser);
  const pairing = usePairing(id, extension.id, landed);
  // The poll's link bridges the moment of linking (a relink after a
  // sign-out included) until the server's status shows it
  const status = pairing.linked ?? (loaded.connected ? loaded : null);
  const state = serviceStateFrom(
    status,
    pairing.code !== null,
    extension.check,
  );
  const look = serviceLook(state);
  // The whole history just landed: the card rings once as the live
  // activity rises in (the status dot pops with its new line)
  const firstSync = useFirstSyncLanded(
    status?.lastSyncedAt ?? null,
    status?.connected === true,
  );
  const surface = appSurface(look);
  const unavailable = surface === 'unavailable';

  // Until the ping answers, the state pill's box only: never a wrong word
  const statePillNode =
    state === 'checking' ? (
      <span aria-hidden="true" className={PILL_GHOST}>
        {statePill(look)}
      </span>
    ) : (
      <AppPill brand={id} variant={surface}>
        {statePill(look)}
      </AppPill>
    );
  const pills = (
    <>
      {statePillNode}
      {service.facts.map((fact) => (
        <AppPill brand={id} key={fact}>
          {fact}
        </AppPill>
      ))}
    </>
  );
  const statusLine = (
    <ServiceStatusLine
      lastSyncedAt={status?.lastSyncedAt ?? null}
      profile={status?.profileName ?? null}
      state={state}
    />
  );

  const body = pairing.code ? (
    <ServicePairingBody
      code={pairing.code}
      confirming={pairing.confirming}
      countdown={pairing.countdown}
      expired={pairing.expired}
      notice={pairing.notice}
      onCancel={pairing.cancel}
      onRenew={pairing.connect}
    />
  ) : (
    <ServiceBody
      activity={activity}
      extension={extension.check}
      onConnect={pairing.connect}
      onDisconnected={pairing.forget}
      pending={pairing.minting}
      review={review}
      state={state}
      status={status}
      syncNow={syncNow}
    />
  );
  const tile = <AppTile app={id} muted={unavailable} />;
  // Connect, the code, the link: each replaces the last in place (Disconnect
  // swaps back to Connect, the card staying open)
  let stage = 'idle';
  if (pairing.code) {
    stage = 'pairing';
  } else if (status) {
    stage = 'linked';
  }

  return (
    <ServiceProvider service={id}>
      {/* The ring sits beside the card: the card clips what passes its edge */}
      <div className="relative">
        <AppCard brand={id} surface={surface}>
          <AppHeader
            name={service.name}
            pills={pills}
            status={statusLine}
            tile={tile}
          >
            <AppToggle app={id} name={service.name} />
          </AppHeader>
          <AppBody app={id}>
            <SwapIn className={BODY_STACK_CLASS} swapKey={stage}>
              {body}
            </SwapIn>
          </AppBody>
        </AppCard>
        {firstSync === 0 ? null : (
          <FlashRing className={FIRST_SYNC_RING} grow={1.02} key={firstSync} />
        )}
      </div>
    </ServiceProvider>
  );
}
