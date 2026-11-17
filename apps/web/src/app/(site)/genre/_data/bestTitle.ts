/** Ranked rows end at 50 */
const BEST_COUNT = 50;
/** Below this a number in the title reads oddly ("The 2 best"), so it goes */
const MIN_NAMED = 3;

/**
 * The ranked list's title ("The 50 best crime shows"). The number in
 * the title is the number shown: a small genre ("The 6 best western
 * shows") says how many it has, a tiny one drops the count ("The best ...").
 */
export function bestTitle(lower: string, shown: number): string {
  if (shown >= BEST_COUNT) {
    return `The ${BEST_COUNT} best ${lower} series`;
  }
  return shown >= MIN_NAMED
    ? `The ${shown} best ${lower} series`
    : `The best ${lower} series`;
}
