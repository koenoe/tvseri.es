import {
  type CalendarDay,
  type CalendarEpisode,
  type CalendarEpisodeKind,
  type CalendarTicket,
  episodeCode,
  type SeriesFacts,
} from '@tvseri.es/schemas';
import { daysBetweenUtc, hasEndedStatus } from '@tvseri.es/utils';

import { episodeKindOf } from '@/lib/episodeKind';
import { releaseOf, type SeasonEpisode } from '@/lib/seasonEpisodes';

export type CalendarWindow = Readonly<{
  /** YYYY-MM-DD, all three */
  from: string;
  to: string;
  today: string;
}>;

/** A show's seasons that may have episodes in the window, as read */
export type ShowSeasons = Readonly<{
  facts: SeriesFacts;
  seasons: ReadonlyMap<number, ReadonlyArray<SeasonEpisode>>;
}>;

const lastSeasonOf = (facts: SeriesFacts) =>
  Math.max(0, ...facts.seasons.map((season) => season.seasonNumber));

/**
 * What an episode is to its season: premiere and finale by the facts'
 * season bounds (so a show numbered on across seasons agrees with the
 * overview), or TMDB's finale mark; the mid-season break by TMDB's mark
 * on the episode before it
 */
const kindOf = (
  facts: SeriesFacts,
  seasonNumber: number,
  episodes: ReadonlyArray<SeasonEpisode>,
  index: number,
): CalendarEpisodeKind => {
  const episode = episodes[index] as SeasonEpisode;
  const base = episodeKindOf(
    { episodeNumber: episode.episodeNumber, seasonNumber },
    facts.seasons,
  );
  if (base === 'season-premiere') return base;
  if (base === 'season-finale' || episode.episodeType === 'finale') {
    return hasEndedStatus(facts.status) && seasonNumber >= lastSeasonOf(facts)
      ? 'series-finale'
      : 'season-finale';
  }
  if (episode.episodeType === 'mid-season') return 'mid-season-finale';
  return episodes[index - 1]?.episodeType === 'mid-season'
    ? 'mid-season-return'
    : 'episode';
};

const ticketKindOf = (
  episodes: ReadonlyArray<CalendarEpisode>,
): CalendarTicket['kind'] => {
  if (episodes.some((episode) => episode.kind === 'season-premiere')) {
    return 'season-premiere';
  }
  return episodes.some(
    (episode) =>
      episode.kind === 'season-finale' || episode.kind === 'series-finale',
  )
    ? 'season-finale'
    : 'episode';
};

const RANK: Readonly<Record<CalendarTicket['kind'], number>> = {
  episode: 2,
  'season-finale': 1,
  'season-premiere': 0,
};

type Placed = Readonly<{ date: string; ticket: CalendarTicket; title: string }>;

/** One show's tickets in the window: per season, one per air date */
const ticketsOf = ({ facts, seasons }: ShowSeasons, window: CalendarWindow) =>
  [...seasons].flatMap(([seasonNumber, episodes]) => {
    const release = releaseOf(episodes);
    const byDate = new Map<string, CalendarEpisode[]>();
    for (const [index, episode] of episodes.entries()) {
      const date = episode.airDate;
      if (!date || date < window.from || date > window.to) continue;
      const list = byDate.get(date) ?? [];
      list.push({
        code: episodeCode({
          episodeNumber: episode.episodeNumber,
          seasonNumber,
        }),
        episode: episode.episodeNumber,
        kind: kindOf(facts, seasonNumber, episodes, index),
        title: episode.title,
      });
      byDate.set(date, list);
    }
    return [...byDate].map(
      ([date, dayEpisodes]): Placed => ({
        date,
        ticket: {
          episodes: dayEpisodes,
          kind: ticketKindOf(dayEpisodes),
          release,
          season: seasonNumber,
          seriesId: facts.id,
        },
        title: facts.title,
      }),
    );
  });

const byTicketOrder = (a: Placed, b: Placed) =>
  RANK[a.ticket.kind] - RANK[b.ticket.kind] ||
  a.title.localeCompare(b.title) ||
  a.ticket.seriesId - b.ticket.seriesId ||
  a.ticket.season - b.ticket.season;

/** The calendar's days: only those with a ticket, in date order */
export const buildDays = (
  shows: ReadonlyArray<ShowSeasons>,
  window: CalendarWindow,
): CalendarDay[] => {
  const byDate = new Map<string, Placed[]>();
  for (const show of shows) {
    for (const placed of ticketsOf(show, window)) {
      byDate.set(placed.date, [...(byDate.get(placed.date) ?? []), placed]);
    }
  }
  return [...byDate.keys()].sort().map((date) => ({
    date,
    daysToGo: daysBetweenUtc(window.today, date),
    tickets: (byDate.get(date) ?? [])
      .sort(byTicketOrder)
      .map((placed) => placed.ticket),
  }));
};
