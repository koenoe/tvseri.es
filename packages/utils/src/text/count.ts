const GROUPED = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** 10927 → "10,927" */
export const formatGrouped = (value: number): string => GROUPED.format(value);

/**
 * The noun alone, for a count drawn on its own (a rolling number):
 * `follower`, `followers`; `many` for irregular plurals.
 */
export const pluralNoun = (count: number, one: string, many = `${one}s`) =>
  count === 1 ? one : many;

/**
 * `1 episode`, `4,812 episodes` (grouped); `many`
 * for irregular plurals: `plural(n, 'series', 'series')`.
 */
export const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatGrouped(count)} ${pluralNoun(count, one, many)}`;
