import type { ConnectionService } from '@tvseri.es/schemas';

import type { AppBrand } from '@/components/brand/appTiles';

import type { AppBrandLook } from '../brand';
import { PLEX_BRAND } from '../plexBrand';
import { BBC_IPLAYER } from './bbc';
import { NETFLIX } from './netflix';
import { PRIME_VIDEO } from './prime';
import type { ConnectedService } from './types';

/** Every connectable service's card (the page's order is `CONNECTION_SERVICES`) */
const CONNECTED_SERVICES: Readonly<
  Record<ConnectionService, ConnectedService>
> = {
  bbc: BBC_IPLAYER,
  netflix: NETFLIX,
  prime: PRIME_VIDEO,
};

export const connectedService = (id: ConnectionService): ConnectedService =>
  CONNECTED_SERVICES[id];

export type { AppBrand };

export const brandOf = (brand: AppBrand): AppBrandLook =>
  brand === 'plex' ? PLEX_BRAND : CONNECTED_SERVICES[brand];
