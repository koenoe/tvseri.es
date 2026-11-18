/** `part` of `total` as a percentage with two decimals; 0 without a total */
export const toPercent = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 10000) / 100 : 0;
