import type {
  Calendar,
  CalendarDay,
  CalendarShow,
  CalendarTicket,
  ComingUpItem,
  Overview,
  WaitingFor,
} from '@tvseri.es/schemas';

import { day } from './time.ts';

/** A ticket's day and show, before the days are grouped */
type Placed = Readonly<{
  date: string;
  daysToGo: number;
  show: CalendarShow;
  ticket: CalendarTicket;
}>;

const code = (season: number, episode: number) =>
  `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

const RANK: Readonly<Record<CalendarTicket['kind'], number>> = {
  episode: 2,
  'season-finale': 1,
  'season-premiere': 0,
};

const EPISODE_KIND = {
  episode: 'episode',
  'season-finale': 'season-finale',
  'season-premiere': 'season-premiere',
} as const;

/** One ticket per Coming up item; a full-season premiere lands whole (six) */
const fromComingUp = (item: ComingUpItem): Placed => {
  const count =
    item.kind === 'season-premiere' && item.release === 'full-season' ? 6 : 1;
  return {
    date: item.date,
    daysToGo: item.daysToGo,
    show: {
      finishedAt: item.finishedAt,
      onWatchlist: item.onWatchlist,
      posterImage: item.posterImage,
      provider: item.provider,
      seriesId: item.seriesId,
      slug: item.slug,
      title: item.title,
    },
    ticket: {
      episodes: Array.from({ length: count }, (_, index) => ({
        code: code(item.season, item.episode + index),
        episode: item.episode + index,
        kind: index === 0 ? EPISODE_KIND[item.kind] : 'episode',
        title: '',
      })),
      kind: item.kind,
      release: item.release,
      season: item.season,
      seriesId: item.seriesId,
    },
  };
};

/** A dated return from Waiting for: its premiere */
const fromWaiting = (waiting: WaitingFor): ReadonlyArray<Placed> =>
  waiting.items.flatMap((item) =>
    item.state === 'dated' && item.nextDate
      ? [
          fromComingUp({
            ...item,
            date: item.nextDate,
            daysToGo: item.daysToGo ?? 0,
            episode: item.nextEpisode ?? 1,
            kind: item.nextKind ?? 'season-premiere',
            onWatchlist: false,
            provider: null,
            release: 'weekly',
            season: item.nextSeason,
          }),
        ]
      : [],
  );

/**
 * `GET /me/calendar` for an invented viewer, as the API builds it from the
 * same follows: Coming up's tickets, the dated returns, and the renewed
 * shows with no date split by what TMDB lists. `extra`: days the overview
 * doesn't carry (one today, one already aired this month). The window is
 * this month and the eleven after it, from the request's today.
 */
export function calendarOf(
  overview: Overview,
  waiting: WaitingFor,
  extra: ReadonlyArray<ComingUpItem> = [],
): Calendar {
  const today = day(0);
  const from = `${today.slice(0, 8)}01`;
  const end = new Date(`${from}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 12);
  end.setUTCDate(0);
  const to = end.toISOString().slice(0, 10);
  const placed = [
    ...[...overview.comingUp, ...extra].map(fromComingUp),
    ...fromWaiting(waiting),
  ].filter(({ date }) => date >= from && date <= to);
  const shows = new Map<number, CalendarShow>();
  const byDate = new Map<string, Placed[]>();
  for (const entry of [...placed].sort((a, b) =>
    a.date.localeCompare(b.date),
  )) {
    shows.set(
      entry.show.seriesId,
      shows.get(entry.show.seriesId) ?? entry.show,
    );
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  }
  const days: CalendarDay[] = [...byDate.entries()].map(([date, entries]) => ({
    date,
    daysToGo: entries[0]?.daysToGo ?? 0,
    tickets: [...entries]
      .sort(
        (a, b) =>
          RANK[a.ticket.kind] - RANK[b.ticket.kind] ||
          a.show.title.localeCompare(b.show.title),
      )
      .map(({ ticket }) => ticket),
  }));
  const renewed = waiting.items.filter((item) => item.state === 'renewed');
  return {
    days,
    from,
    noDateYet: {
      listed: renewed.filter((item) => item.listedEpisodes),
      renewed: renewed.filter((item) => !item.listedEpisodes),
    },
    shows: [...shows.values()],
    to,
    today,
  };
}
