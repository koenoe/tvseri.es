import * as v from 'valibot';

/**
 * The services a viewer can connect, by the id routes, stored keys and the
 * extension share. Kept apart from ./connections.ts so ./watched.ts can read
 * sync tags without an import cycle.
 */
export const CONNECTION_SERVICES = ['netflix', 'bbc', 'prime'] as const;
export type ConnectionService = (typeof CONNECTION_SERVICES)[number];

export const ConnectionServiceSchema = v.picklist(CONNECTION_SERVICES);

/**
 * A sync tags its episodes `<service>-sync:<id>` in place of an import id, so
 * the card's activity can find them.
 */
export const syncTagPrefix = (service: ConnectionService) =>
  `${service}-sync:` as const;
