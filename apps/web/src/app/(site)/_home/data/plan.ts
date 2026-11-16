import {
  type FeatureKind,
  featureKindOfDay,
  isIfYouLikedDay,
  type ToyKind,
  toyKindOfDay,
} from '@tvseri.es/utils';

import { addDays } from './day';

/**
 * What a day plans for Home's two rotating slots, from the date alone (the
 * same rules the API and the page use):
 * the feature after Hidden gems, the toy after Premieres, and whether a
 * signed-in viewer gets "If you liked X" in the toy's slot. Not in the plan:
 * the Countdown (it takes the feature's slot when the next big premiere is 3
 * days away or less: premieres data) and a fall-through (the API gives the
 * slot to the next kind when the planned one has nothing that day).
 */
export type DayPlan = Readonly<{
  day: string;
  feature: FeatureKind;
  ifYouLiked: boolean;
  toy: ToyKind;
}>;

export const planOf = (day: string): DayPlan => ({
  day,
  feature: featureKindOfDay(day),
  ifYouLiked: isIfYouLikedDay(day),
  toy: toyKindOfDay(day),
});

/** The plans of `count` days from `from` on */
export const plansFrom = (from: string, count: number) =>
  Array.from({ length: count }, (_, index) => planOf(addDays(from, index)));

/** The first day from `from` on (within `horizon` days) whose plan matches */
export const nextDay = (
  from: string,
  matches: (plan: DayPlan) => boolean,
  horizon = 60,
): string | null =>
  plansFrom(from, horizon).find((plan) => matches(plan))?.day ?? null;
