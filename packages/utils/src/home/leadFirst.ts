type Ranked = Readonly<{
  rank: number;
  series: Readonly<{ backdropImage?: string | null }>;
}>;

/**
 * Home's "New this week": rank order, with the lead first. The lead is drawn
 * wide on its backdrop, so it is the highest-ranked item that has one; the
 * rest keep their rank order behind it. Without any backdrop there is no
 * lead and the order is the rank's. The API orders its answer this way and
 * the web again after leaving out the shows its neighbours already draw.
 */
export const leadFirst = <T extends Ranked>(
  items: ReadonlyArray<T>,
): ReadonlyArray<T> => {
  const ranked = [...items].sort((a, b) => a.rank - b.rank);
  const lead = ranked.findIndex((item) => !!item.series.backdropImage);
  if (lead <= 0) {
    return ranked;
  }
  return [ranked[lead]!, ...ranked.slice(0, lead), ...ranked.slice(lead + 1)];
};
