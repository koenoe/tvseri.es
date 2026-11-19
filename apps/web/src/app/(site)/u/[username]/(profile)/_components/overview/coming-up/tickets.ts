import { type ComingUpItem, episodeCode } from '@tvseri.es/schemas';
import { countdownOf, plural } from '@tvseri.es/utils';

const UNITS = {
  day: ['Day', 'Days'],
  month: ['Month', 'Months'],
  week: ['Week', 'Weeks'],
} as const;

/** The ticket stub: "2 DAYS", "3 WEEKS", "4 MONTHS" (the shared `countdownOf` rule) */
export function countdown(
  daysToGo: number,
): Readonly<{ n: string; unit: string }> {
  const { count, unit } = countdownOf(daysToGo);
  if (unit === 'today') {
    return { n: '', unit: 'Today' };
  }
  const [one, many] = UNITS[unit];
  return { n: String(count), unit: count === 1 ? one : many };
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
      ? `Back after ${plural(backAfterMonths, 'month')}`
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
