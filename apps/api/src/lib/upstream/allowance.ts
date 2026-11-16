import { takeFromAllowance } from '@/lib/db/cache';
import { logWarn } from '@/utils/logWarn';
import { DAY_MS, startOfDayUtc, todayUtc } from '@/utils/time';

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
