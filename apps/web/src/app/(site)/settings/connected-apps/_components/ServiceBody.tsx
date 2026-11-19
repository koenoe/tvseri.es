'use client';

import type { ReactNode } from 'react';
import type { ExtensionCheck } from '@/lib/extension/extension';
import { isLive } from '../_lib/appState';
import type { ServiceCardStatus } from '../_lib/serviceCard';
import { type ServiceState, serviceLook } from '../_lib/serviceState';
import ServiceConnectedBody from './ServiceConnectedBody';
import ServiceIdleBody from './ServiceIdleBody';
import ServiceReconnect from './ServiceReconnect';

/**
 * The open service card's body when no code is on screen: Connect before a
 * link, else the connected body (led by Connect again once the service signed
 * the session out).
 */
export default function ServiceBody({
  activity,
  syncNow,
  extension,
  onConnect,
  onDisconnected,
  pending,
  review,
  state,
  status,
}: Readonly<{
  activity: ReactNode;
  syncNow: boolean;
  extension: ExtensionCheck;
  onConnect: () => void;
  onDisconnected: () => void;
  /** A code is being minted */
  pending: boolean;
  review: ReactNode;
  state: ServiceState;
  /** The link's status; null before one */
  status: ServiceCardStatus | null;
}>) {
  if (!status) {
    return (
      <ServiceIdleBody
        extension={extension}
        onConnect={onConnect}
        pending={pending}
      />
    );
  }
  const reconnecting = state === 'signed-out';
  const live = isLive(serviceLook(state));
  return (
    <>
      {reconnecting ? (
        <ServiceReconnect
          extension={extension}
          onConnect={onConnect}
          pending={pending}
        />
      ) : null}
      <ServiceConnectedBody
        activity={activity}
        live={live}
        onDisconnected={onDisconnected}
        reconnecting={reconnecting}
        review={review}
        status={status}
        syncNow={syncNow}
      />
    </>
  );
}
