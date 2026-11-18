import { DAY_MS, startOfDayUtc, todayUtc } from '@tvseri.es/utils';
import { takeFromAllowance } from '@/lib/db/cache';
import type { Breaker } from '@/lib/upstream/breaker';
import { UpstreamUnavailableError } from '@/lib/upstream/errors';
import { logWarn } from '@/utils/logWarn';

/** The day's counter outlives its day, so a late call still finds it */
const ALLOWANCE_TTL = 2 * 24 * 60 * 60;

const LABEL = { mdblist: 'MDBList', omdb: 'OMDb' } as const;

/**
 * Takes one call from an upstream's allowance for the UTC day, shared by
 * every Lambda (one counter per day in the Cache table): false once `cap`
 * calls were taken. Best effort: when the counter can't be read the call
 * goes ahead (the breaker still guards the upstream).
 */
export const takeDailyAllowance = async (
  source: keyof typeof LABEL,
  cap: number,
): Promise<boolean> => {
  try {
    return await takeFromAllowance(
      `${source}-calls:v1:${todayUtc()}`,
      cap,
      ALLOWANCE_TTL,
    );
  } catch (error) {
    logWarn(`${LABEL[source]} allowance unreadable, calling anyway`, error);
    return true;
  }
};

/** When the next UTC day starts (epoch ms): a spent allowance comes back */
export const nextUtcMidnight = (now: number = Date.now()) =>
  startOfDayUtc(now) + DAY_MS;

/**
 * The guard before every call to a quota'd upstream (OMDb, MDBList): an open
 * breaker or a spent allowance throws "unavailable". A spent allowance also
 * opens the breaker until the allowance comes back at UTC midnight, so the
 * rest of the day costs no counter writes.
 */
export const takeAllowanceOrThrow = async (
  source: keyof typeof LABEL,
  cap: number,
  breaker: Breaker,
): Promise<void> => {
  if (await breaker.isOpen()) {
    throw new UpstreamUnavailableError(source, 60, 'circuit open');
  }
  if (!(await takeDailyAllowance(source, cap))) {
    const until = nextUtcMidnight();
    await breaker.openUntil(until, 'daily allowance spent');
    throw new UpstreamUnavailableError(
      source,
      (until - Date.now()) / 1000,
      'daily allowance spent',
    );
  }
};
