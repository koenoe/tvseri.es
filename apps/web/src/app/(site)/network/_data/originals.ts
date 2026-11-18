import type { NetworkLandingFacts } from '@tvseri.es/schemas';
import { formatGrouped } from '@tvseri.es/utils';

import { formatCappedCount } from '@/lib/formatCount';

/**
 * A guess from a sample, rounded so it reads as one: to 10 below 1,000, to
 * 100 from there ("about 340", "about 1,300").
 */
const stepFor = (value: number) => (value < 1000 ? 10 : 100);

const roundEstimate = (value: number) =>
  Math.round(value / stepFor(value)) * stepFor(value);

/**
 * The subtitle of "{network} originals": how many of the
 * network's shows first aired there. Exact when every show was scanned
 * ("All 244 of its shows first aired on Apple TV"), otherwise scaled from the
 * scanned sample ("First aired on HBO: about 340 of its 381 shows"). Null
 * when it has no originals: then the row is left out.
 */
export function originalsLine(
  originals: NetworkLandingFacts['originals'],
  count: number,
  name: string,
): string | null {
  const { exact, found, scanned } = originals;
  if (found === 0 || count === 0) {
    return null;
  }
  const total = formatCappedCount(count);
  if (exact) {
    return found >= count
      ? `All ${total} of its series first aired on ${name}`
      : `First aired on ${name}: ${formatGrouped(found)} of its ${total} series`;
  }
  const estimate = roundEstimate((found / Math.max(scanned, 1)) * count);
  // "about 380 of its 381" reads oddly: within one rounding step is almost all
  if (estimate > count - stepFor(count)) {
    return `First aired on ${name}: almost all of its ${total} series`;
  }
  return `First aired on ${name}: about ${formatGrouped(Math.max(estimate, found))} of its ${total} series`;
}
