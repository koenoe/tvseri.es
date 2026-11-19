/** Apart so the connection, its sync runs and its review list don't import one another */

import type { ConnectionService } from '@tvseri.es/schemas';

/** The partition holding a user's connections, review lists and live-code pointer */
export const connectionsPk = (userId: string) => `USER#${userId}`;
const connectionSk = (service: ConnectionService) => `SERVICE#${service}`;
export const connectionKey = (userId: string, service: ConnectionService) => ({
  pk: connectionsPk(userId),
  sk: connectionSk(service),
});

/** An open review entry: `UNRESOLVED#{service}#{id}` */
export const openPrefix = (service: ConnectionService) =>
  `UNRESOLVED#${service}#`;
/** A resolved or dismissed entry's marker: `CLOSED#{service}#{id}` */
export const closedPrefix = (service: ConnectionService) =>
  `CLOSED#${service}#`;
export const countSk = (service: ConnectionService) =>
  `UNRESOLVEDCOUNT#${service}`;
