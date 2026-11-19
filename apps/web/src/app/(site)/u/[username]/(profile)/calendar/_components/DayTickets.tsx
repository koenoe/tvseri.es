'use client';

import type { ComingUpItem } from '@tvseri.es/schemas';
import { type ComponentType, Fragment, type ReactNode } from 'react';

import Ticket from '../../_components/overview/coming-up/Ticket';
import {
  monthsBetween,
  ticketText,
} from '../../_components/overview/coming-up/tickets';
import type { CalendarDayModel, DayTicket } from '../_lib/calendarModel';

/** A calendar ticket as the overview's Ticket reads it: its first episode leads */
const itemOf = (
  day: CalendarDayModel,
  { show, ticket }: DayTicket,
): ComingUpItem => ({
  date: day.date,
  daysToGo: day.daysToGo,
  episode: ticket.episodes[0]?.episode ?? 1,
  finishedAt: show.finishedAt,
  kind: ticket.kind,
  onWatchlist: show.onWatchlist,
  posterImage: show.posterImage,
  provider: show.provider,
  release: ticket.release,
  season: ticket.season,
  seriesId: show.seriesId,
  slug: show.slug,
  title: show.title,
});

/**
 * A day's tickets, premieres first: the overview's Ticket, unchanged, each
 * a link to its show. A whole season on one day is one ticket ("Full
 * season · all 6"). `Item` wraps each (the sheet's stagger).
 */
export default function DayTickets({
  day,
  Item = Fragment,
  now,
}: Readonly<{
  day: CalendarDayModel;
  Item?: ComponentType<{ children: ReactNode }>;
  now: number;
}>) {
  return day.tickets.map((entry) => {
    const item = itemOf(day, entry);
    const back = item.finishedAt
      ? monthsBetween(item.finishedAt, item.date)
      : null;
    const text = ticketText(item, {
      backAfterMonths: back,
      code: entry.ticket.episodes[0]?.code,
      episodes: entry.ticket.episodes.length,
    });
    return (
      <Item key={`${item.seriesId}-${item.season}`}>
        <Ticket item={item} now={now} text={text} />
      </Item>
    );
  });
}
