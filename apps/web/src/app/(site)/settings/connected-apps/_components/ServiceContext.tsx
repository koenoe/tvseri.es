'use client';

import type { ConnectionService } from '@tvseri.es/schemas';
import { createContext, type ReactNode, use } from 'react';

import { connectedService } from '../../_lib/services';
import type { ConnectedService } from '../../_lib/services/types';

const ServiceContext = createContext<ConnectedService | null>(null);

/**
 * Which service a card is: its panel provides it, so every part inside
 * (the bodies, the sync row, the review list the server renders into it)
 * reads its name, brand and copy without passing it down. Takes the id: the
 * config holds components, so it never crosses from the server.
 */
export function ServiceProvider({
  children,
  service,
}: Readonly<{ children: ReactNode; service: ConnectionService }>) {
  return (
    <ServiceContext value={connectedService(service)}>
      {children}
    </ServiceContext>
  );
}

export function useConnectedService(): ConnectedService {
  const service = use(ServiceContext);
  if (!service) {
    throw new Error('Wrap a service card’s parts in <ServiceProvider>');
  }
  return service;
}
