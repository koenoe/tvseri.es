import type {
  ConnectionService,
  ConnectionSyncError,
} from '@tvseri.es/schemas';

import type { AppBrandLook } from '../brand';

/**
 * Everything on a service's card that differs per service. Adding a service
 * is one of these (./index.ts) plus an entry in the extension.
 */
export type ConnectedService = AppBrandLook &
  Readonly<{
    copy: Readonly<{
      /** The live card's spotlight overline */
      activityHeading: string;
      /** Null for a service whose reader stores no profile (BBC iPlayer) */
      profileTitle: string | null;
      /** Above the connected body once the service signed the session out */
      reconnect: string;
      /** The status line once the service signed the session out */
      signedOutStatus: string;
      /** The setup steps, while not connected or pairing */
      steps: ReadonlyArray<string>;
      /** Without `profile-changed`, that error falls back to the generic line */
      syncFailed: Readonly<
        Record<
          Exclude<ConnectionSyncError, 'failed' | 'profile-changed'>,
          string
        > &
          Partial<Record<'profile-changed', string>>
      >;
      /** The sync row while a run reads */
      syncRunning: string;
      /** Where the extension can't run: what connecting needs instead */
      unavailable: string;
    }>;
    id: ConnectionService;
    /** Where to sign in, as the extension's popup names it */
    site: string;
  }>;
