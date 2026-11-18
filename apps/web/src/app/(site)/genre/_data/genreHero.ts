import type { GenreLandingFacts } from '@tvseri.es/schemas';

import { formatCappedCount, isCappedCount } from '@/lib/formatCount';
import { joinAnd } from '@/lib/text/fitNames';

import { formatPercent } from '../../_discover/landing/format';
import type { LandingFact } from '../../_discover/landing/LandingHero';

/**
 * The four facts under the genre's line: the count, the share also
 * in its closest genre, the peak decade, and what's new in the last year. A
 * fact the API couldn't work out is left out, never shown as 0.
 */
export function genreFacts(
  facts: GenreLandingFacts,
): ReadonlyArray<LandingFact> {
  const [closest] = facts.alsoWith;
  const list: Array<LandingFact | null> = [
    { caption: 'series on TMDB', value: formatCappedCount(facts.count) },
    // The share is of TMDB's count: at its cap that base is a floor, so the
    // share would be wrong. Left out, like any fact the API could not work out.
    closest && !isCappedCount(facts.count)
      ? {
          caption: `are also ${closest.name}`,
          value: formatPercent(closest.percent),
        }
      : null,
    facts.peakDecade
      ? {
          caption: `started in the ${facts.peakDecade.slug}`,
          value: formatCappedCount(facts.peakDecade.count),
        }
      : null,
    {
      caption: 'new in the last year',
      value: formatCappedCount(facts.newLastYear),
    },
  ];
  return list.filter((fact): fact is LandingFact => fact !== null);
}

/**
 * The hero meta line's genres: "Often with Drama and Mystery" on desktop,
 * "With Drama, Mystery" on a phone. Null without any.
 */
export function oftenWith(
  facts: GenreLandingFacts,
): Readonly<{ desktop: string; phone: string }> | null {
  const names = facts.alsoWith.slice(0, 2).map((genre) => genre.name);
  if (names.length === 0) {
    return null;
  }
  return {
    desktop: `Often with ${joinAnd(names)}`,
    phone: `With ${names.join(', ')}`,
  };
}
