const GROUPED = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** 10927 → "10,927" */
export const formatGrouped = (value: number): string => GROUPED.format(value);

/**
 * `1 episode`, `4,812 episodes` (grouped); `many`
 * for irregular plurals: `plural(n, 'series', 'series')`.
 */
export const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatGrouped(count)} ${count === 1 ? one : many}`;
