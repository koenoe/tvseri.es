import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';

import { DAY_BUILD_TTL, readDayBuild } from '@/lib/db/cache/readThroughDay';
import { hasTimeForAnother } from '@/lib/deadline';
import { PARTIAL_TTL } from '@/utils/cacheHeader';
import { logWarn } from '@/utils/logWarn';

import { logFallThrough, reasonOf } from './fallThrough';

/**
 * What Home's two slots of the day share (the feature, `feature.ts`, and the
 * toy, `toy.ts`): trying the day's kinds in order until one builds, and
 * keeping what was built as a day build.
 */

type Slot = 'feature' | 'toy';

/** Called with the number of lookups that failed while building */
export type Report = (failed: number) => void;

/** `result` is undefined when there is nothing to show */
export type MomentOfDay<T> = Readonly<{
  partial: boolean;
  result: T | undefined;
}>;

/**
 * The first kind in `order` that builds something: the planned kind first;
 * when it has nothing today or fails, the next one takes the slot (a logged
 * fall-through). Undefined when none builds, or when the request runs out of
 * time before the next one (reported as a failed lookup).
 */
export const buildFirstKind = async <K extends string, M>({
  builders,
  date,
  order,
  planned,
  report,
  slot,
}: Readonly<{
  builders: Readonly<
    Record<K, (date: string, report: Report) => Promise<M | undefined>>
  >;
  date: string;
  order: ReadonlyArray<K>;
  planned: K;
  report: Report;
  slot: Slot;
}>): Promise<M | undefined> => {
  const why: string[] = [];
  for (const [i, kind] of order.entries()) {
    if (i > 0 && !hasTimeForAnother()) {
      why.push(`${kind}: out of time`);
      report(1);
      break;
    }
    try {
      const moment = await builders[kind](date, report);
      if (moment) {
        if (kind !== planned) {
          logFallThrough(slot, { date, planned, used: kind, why });
        }
        return moment;
      }
      why.push(`${kind}: nothing to show`);
    } catch (error) {
      logWarn(`Home ${slot}: ${kind} failed, trying the next kind`, error);
      why.push(`${kind}: ${reasonOf(error)}`);
      report(1);
    }
  }
  logFallThrough(slot, { date, planned, used: null, why });
  return undefined;
};

/**
 * A slot's moment of the day, built once per day (Cache table, 24 h; 1 h
 * when lookups failed on the way; nothing built is never stored, so the next
 * read tries again). Yesterday's stands in while today's is built or when it
 * can't be, as `partial`. `only` (the dev preview of one kind) has a key of
 * its own. The key's version is shared with the web's request URL
 * (`HOME_MOMENTS_VERSION`).
 */
export const readMomentOfDay = <T>({
  build,
  date,
  only,
  slot,
}: Readonly<{
  build: (report: Report) => Promise<T | undefined>;
  date: string;
  only: string | undefined;
  slot: Slot;
}>): Promise<MomentOfDay<T>> =>
  readDayBuild<MomentOfDay<T>>({
    day: date,
    key: (day) =>
      `home:${slot}:v${HOME_MOMENTS_VERSION}:${day}${only ? `:${only}` : ''}`,
    load: async () => {
      let failed = 0;
      const result = await build((count) => {
        failed += count;
      });
      return { partial: failed > 0, result };
    },
    ttl: ({ partial, result }) =>
      result ? (partial ? PARTIAL_TTL : DAY_BUILD_TTL) : false,
  });
