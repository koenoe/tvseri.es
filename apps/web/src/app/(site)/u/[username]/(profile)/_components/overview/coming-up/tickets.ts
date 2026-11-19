import {
  type ComingUpItem,
  episodeCode,
  type Overview,
  type WaitingFor,
} from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import { countdownOf, stubUnit } from '@/lib/format/countdown';

/**
 * The ticket stub: "2 DAYS", "3 WEEKS", "4 MONTHS" (the shared `countdownOf`
 * rule); "AIRED" on a calendar day that has passed
 */
export function countdown(
  daysToGo: number,
): Readonly<{ n: string; unit: string }> {
  if (daysToGo < 0) {
    return { n: '', unit: 'Aired' };
  }
  const { count, unit } = countdownOf(daysToGo);
  if (unit === 'today') {
    return { n: '', unit: 'Today' };
  }
  return { n: String(count), unit: stubUnit(count, unit) };
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

type TicketExtras = Readonly<{
  /** A finished show's wait, for "Back after 9 months" */
  backAfterMonths?: number | null;
  /** The code as the API spells it (a show numbered on across seasons) */
  code?: string;
  /** How many of the show's episodes air that day (the calendar's tickets) */
  episodes?: number;
}>;

/**
 * What a ticket says about the episode. A calendar ticket that holds more
 * than one episode says so: "Full season · all 6", or "2 episodes".
 */
export function ticketText(
  item: ComingUpItem,
  { backAfterMonths = null, code, episodes = 1 }: TicketExtras = {},
): TicketText {
  const release =
    item.release === 'weekly'
      ? 'Weekly'
      : item.release === 'full-season'
        ? 'Full season'
        : null;
  const several =
    episodes <= 1
      ? null
      : item.release === 'full-season'
        ? `Full season · all ${episodes}`
        : `${episodes} episodes`;
  const back =
    backAfterMonths && backAfterMonths > 0
      ? `Back after ${plural(backAfterMonths, 'month')}`
      : null;
  const badge =
    code ??
    episodeCode({
      episodeNumber: item.episode,
      seasonNumber: item.season,
    });
  if (item.kind === 'season-premiere') {
    return {
      badge: null,
      kind: 'premiere',
      label: `Season ${item.season} premiere`,
      note: several ?? release ?? back,
    };
  }
  if (item.kind === 'season-finale') {
    return { badge, kind: 'finale', label: 'Season finale', note: several };
  }
  return { badge, kind: 'episode', label: null, note: several ?? release };
}

/** Whole months between finishing a show and its return */
export function monthsBetween(from: number, to: string): number {
  const end = Date.parse(to);
  return Math.max(0, Math.round((end - from) / (30.44 * 86_400_000)));
}

/**
 * Nothing ahead at all: no ticket in the 30 days, no date after them and
 * no show waiting for one, so the calendar would be empty too
 */
export const nothingAhead = (
  { comingUp, datedLater }: Pick<Overview, 'comingUp' | 'datedLater'>,
  waiting: WaitingFor,
) => comingUp.length === 0 && !datedLater && waiting.items.length === 0;
