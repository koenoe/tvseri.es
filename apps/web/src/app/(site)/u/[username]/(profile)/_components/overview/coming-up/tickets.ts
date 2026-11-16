import type { ComingUpItem } from '@tvseri.es/schemas';
import { episodeCode } from '@/lib/marking/copy';

/** The ticket stub: "2 DAYS", "3 WEEKS"; under two weeks in days */
export function countdown(
  daysToGo: number,
): Readonly<{ n: string; unit: string }> {
  if (daysToGo <= 0) {
    return { n: '', unit: 'Today' };
  }
  if (daysToGo < 14) {
    return { n: String(daysToGo), unit: daysToGo === 1 ? 'Day' : 'Days' };
  }
  const weeks = Math.round(daysToGo / 7);
  return { n: String(weeks), unit: weeks === 1 ? 'Week' : 'Weeks' };
}

export type TicketText = Readonly<{
  kind: 'premiere' | 'finale' | 'episode';
  /** The code badge (episodes and finales; premieres name the season instead) */
  badge: string | null;
  /** "Season 3 premiere" (pink) / "Season finale" (cyan) */
  label: string | null;
  /** "Weekly", "Full season", "Back after 9 months" */
  note: string | null;
}>;

/** What a ticket says about the episode */
export function ticketText(
  item: ComingUpItem,
  backAfterMonths: number | null = null,
): TicketText {
  const release =
    item.release === 'weekly'
      ? 'Weekly'
      : item.release === 'full-season'
        ? 'Full season'
        : null;
  const back =
    backAfterMonths && backAfterMonths > 0
      ? `Back after ${backAfterMonths} ${backAfterMonths === 1 ? 'month' : 'months'}`
      : null;
  const code = episodeCode({
    episodeNumber: item.episode,
    seasonNumber: item.season,
  });
  if (item.kind === 'season-premiere') {
    return {
      badge: null,
      kind: 'premiere',
      label: `Season ${item.season} premiere`,
      note: release ?? back,
    };
  }
  if (item.kind === 'season-finale') {
    return { badge: code, kind: 'finale', label: 'Season finale', note: null };
  }
  return { badge: code, kind: 'episode', label: null, note: release };
}

/** Whole months between finishing a show and its return */
export function monthsBetween(from: number, to: string): number {
  const end = Date.parse(to);
  return Math.max(0, Math.round((end - from) / (30.44 * 86_400_000)));
}
