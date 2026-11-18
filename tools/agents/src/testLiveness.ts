import type { ProcIdentity } from './proc.ts';
import type { Liveness } from './registry.ts';

/** A fake process table for tests: the identities and group ids listed are alive. */
export const fakeLiveness = (
  alive: readonly ProcIdentity[],
  groups: readonly number[] = [],
): Liveness => ({
  hasGroup: (pgid) => groups.includes(pgid),
  isSame: (identity) =>
    alive.some((p) => p.pid === identity.pid && p.lstart === identity.lstart),
});
