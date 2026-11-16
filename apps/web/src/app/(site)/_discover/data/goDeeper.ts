import 'server-only';

import type { GoDeeper } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isStandIn,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

import { type TileShow, toTileShow } from './tileShow';

export type GoDeeperCardView = Readonly<{
  kind: GoDeeper['cards'][number]['kind'];
  why: string;
  /** the trending show it starts from; `rank` 1 = first this week */
  from: Readonly<{ id: number; title: string; rank: number }>;
  to: Readonly<{ id: number; name: string; slug: string }>;
  total: number;
  items: ReadonlyArray<TileShow>;
}>;

export type GoDeeperView = Readonly<{
  /** the UTC day the rotation is for (`YYYY-MM-DD`) */
  date: string;
  essentials: Readonly<{
    network: Readonly<{ id: number; name: string; slug: string }>;
    total: number;
    items: ReadonlyArray<TileShow>;
  }>;
  cards: ReadonlyArray<GoDeeperCardView>;
}>;

/** `YYYY-MM-DD` in UTC */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Today's network Essentials row and Go deeper cards
 * (`GET /discover/go-deeper?date=`), cached `short` like the API. The UTC day
 * is read inside the cached scope (never at the top of a page): it is the day
 * the entry was generated, so the prerendered hub can lag a day behind the
 * rotation; a day-old value is still one
 * the API accepts, and `date` says which day it is.
 */
export async function getGoDeeper(): Promise<GoDeeperView | Unavailable> {
  'use cache';
  cacheTag('go-deeper');

  const date = today();
  const response = await tryApi(() =>
    apiFetch<GoDeeper>('/discover/go-deeper', { query: { date } }),
  );
  if (isUnavailable(response)) {
    cacheLife('unavailable');
    return response;
  }
  if (isStandIn(response, date)) {
    cacheLife('unavailable');
  } else {
    cacheLife('short');
  }
  return {
    cards: response.cards.map((card) => ({
      from: { id: card.from.id, rank: card.from.rank, title: card.from.title },
      items: card.items.map(toTileShow),
      kind: card.kind,
      to: { id: card.to.id, name: card.to.name, slug: card.to.slug },
      total: card.total,
      why: card.why,
    })),
    date: response.date,
    essentials: {
      items: response.essentials.items.map(toTileShow),
      network: {
        id: response.essentials.network.id,
        name: response.essentials.network.name,
        slug: response.essentials.network.slug,
      },
      total: response.essentials.total,
    },
  };
}
