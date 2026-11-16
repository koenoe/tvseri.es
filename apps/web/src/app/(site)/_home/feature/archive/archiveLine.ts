import type { Feature } from '@tvseri.es/schemas';

type Archive = Extract<Feature, Readonly<{ kind: 'archive' }>>;

/**
 * "24 years old, not trending this week": the rank is said once, in the
 * sentence above it ("The oldest series in the all-time top 5…")
 */
export function archiveWhy(feature: Archive): string {
  return `${feature.yearsOld} years old, not trending this week`;
}

const sentence = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

/** Why it is in the archive: its standing, and that nobody is watching it now */
function standingSentence(feature: Archive): string {
  const allTime = feature.allTime;
  if (allTime?.oldest) {
    return `The oldest series in the all-time top ${allTime.top}, and the one nobody is talking about this week.`;
  }
  if (allTime) {
    return `One of the all-time top ${allTime.top}, and nobody is talking about it this week.`;
  }
  return `${feature.yearsOld} years on, and nobody is talking about it this week.`;
}

/**
 * The banner's two sentences: the show's own tagline, then why it is here
 * ("Five seasons, one city, every institution in it. The oldest show in the
 * all-time top 5, and the one nobody is talking about this week.").
 */
export function archiveLine(feature: Archive): string {
  return [sentence(feature.series.tagline), standingSentence(feature)]
    .filter(Boolean)
    .join(' ');
}
