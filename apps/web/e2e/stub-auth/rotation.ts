/**
 * Rotating refresh tokens for the auth stub, with the same rules as the real
 * issuer (`@openauthjs/openauth` 0.4.3, `issuer.ts`, grant `refresh_token`):
 *
 * - Every refresh token has a successor reserved in advance (`nextToken`).
 * - The first use stamps `timeUsed` and returns the successor. Any use within
 *   the reuse window (`ttl.reuse`, 300 s in `apps/auth`) returns that same
 *   successor again, so concurrent refreshes all get the same tokens.
 * - After the window the used token is gone (`apps/auth` keeps the default
 *   `retention` of 0) and the issuer answers `400 invalid_grant` ("used or
 *   expired").
 * - A revoked or unknown token is `400 invalid_grant` too.
 *
 * Time is the stub's own: `lapse(ns)` moves one session family past its reuse
 * window without waiting. Counters per namespace let a test assert how many
 * refresh calls reached the issuer. Test-only; never used by the real service.
 */

type Entry = {
  expiresAt: number;
  nextToken: string;
  timeUsed?: number;
};

export type Family = Readonly<{
  /** Access token lifetime (seconds) of the tokens a refresh issues. */
  accessSeconds: number;
  name: string;
  ns: string;
  /** Reuse window in seconds (`ttl.reuse`); 0 = single use, no grace. */
  reuseSeconds: number;
}>;

export type RefreshOutcome = Readonly<
  | {
      ok: true;
      /** The refresh token to hand out (`stub-rot.<ns>.<id>`). */
      refreshToken: string;
      /** Epoch ms the access token's lifetime starts from (`timeUsed`). */
      issuedAt: number;
      family: Family;
    }
  | { ok: false }
>;

export type Stats = {
  /** `/token` calls with one of this family's tokens. */
  calls: number;
  /** Calls answered with `invalid_grant`. */
  rejected: number;
  /** Calls answered with tokens (first use or within the reuse window). */
  issued: number;
  /** Delay (ms) after the rotation is stored and before the answer. */
  delayMs: number;
  /** Answer every call with this status instead (e.g. 503). */
  failWith?: number;
};

const PREFIX = 'stub-rot.';
// The real refresh TTL is much longer than any test; one day is plenty.
const REFRESH_SECONDS = 24 * 60 * 60;

export function createRotation(now: () => number = Date.now) {
  const families = new Map<string, Family>();
  const firstTokens = new Map<string, string>();
  const entries = new Map<string, Entry>();
  const stats = new Map<string, Stats>();

  const newId = () => crypto.randomUUID();
  const tokenFor = (ns: string, id: string) => `${PREFIX}${ns}.${id}`;

  function store(ns: string, id: string, ttlSeconds: number) {
    entries.set(`${ns}.${id}`, {
      expiresAt: now() + ttlSeconds * 1000,
      nextToken: newId(),
    });
  }

  function statsOf(ns: string): Stats {
    let item = stats.get(ns);
    if (!item) {
      item = { calls: 0, delayMs: 0, issued: 0, rejected: 0 };
      stats.set(ns, item);
    }
    return item;
  }

  return {
    fault(
      ns: string,
      fault: Readonly<{ delayMs?: number; failWith?: number }>,
    ) {
      const counter = statsOf(ns);
      counter.delayMs = fault.delayMs ?? 0;
      counter.failWith = fault.failWith;
    },

    /** Moves the family's used tokens past their reuse window. */
    lapse(ns: string): void {
      for (const [key, entry] of entries) {
        if (key.startsWith(`${ns}.`) && entry.timeUsed !== undefined) {
          entries.delete(key);
        }
      }
    },

    /** The namespace a rotating token belongs to (for faults and counters). */
    namespaceOf(token: string): string | undefined {
      return token.slice(PREFIX.length).split('.')[0];
    },

    owns(token: string | null): boolean {
      return token?.startsWith(PREFIX) ?? false;
    },

    /** The issuer's `refresh_token` grant, step for step. */
    refresh(token: string): RefreshOutcome {
      const [ns, id] = token.slice(PREFIX.length).split('.');
      const family = ns ? families.get(ns) : undefined;
      if (!ns || !id || !family) {
        return { ok: false };
      }
      const counter = statsOf(ns);
      counter.calls += 1;
      const key = `${ns}.${id}`;
      const entry = entries.get(key);
      if (!entry || entry.expiresAt < now()) {
        entries.delete(key);
        counter.rejected += 1;
        return { ok: false };
      }
      const firstUse = entry.timeUsed === undefined;
      if (family.reuseSeconds <= 0) {
        entries.delete(key);
      } else if (firstUse) {
        entry.timeUsed = now();
        entry.expiresAt = now() + family.reuseSeconds * 1000;
      }
      const issuedAt = entry.timeUsed ?? now();
      if (firstUse || family.reuseSeconds <= 0) {
        store(ns, entry.nextToken, REFRESH_SECONDS);
      }
      counter.issued += 1;
      return {
        family,
        issuedAt,
        ok: true,
        refreshToken: tokenFor(ns, entry.nextToken),
      };
    },

    /** Revokes every refresh token of the family (a definitive verdict). */
    revoke(ns: string): void {
      for (const key of [...entries.keys()]) {
        if (key.startsWith(`${ns}.`)) {
          entries.delete(key);
        }
      }
    },

    /**
     * Refreshes the family's first token as some other client would (another
     * server instance, a dev server since restarted): the rotation happens,
     * and its answer never reaches the browser.
     */
    spend(ns: string): RefreshOutcome {
      const token = firstTokens.get(ns);
      return token ? this.refresh(token) : { ok: false };
    },
    /** Starts a session family and returns its first refresh token. */
    start(family: Family): string {
      families.set(family.ns, family);
      stats.set(family.ns, { calls: 0, delayMs: 0, issued: 0, rejected: 0 });
      const id = newId();
      store(family.ns, id, REFRESH_SECONDS);
      firstTokens.set(family.ns, tokenFor(family.ns, id));
      return tokenFor(family.ns, id);
    },

    stats(ns: string): Stats {
      return statsOf(ns);
    },
  };
}
