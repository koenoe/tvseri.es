import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { tags } from '@/lib/cache/tags';
import { cacheLifeFor } from '@/lib/cache/unavailable';

import { getCardData } from './cardData';
import { drawCard } from './draw';
import type { CardLayoutName } from './layout';
import type { CardTheme } from './theme';

type CardImageResult =
  | Readonly<{ image: Uint8Array<ArrayBuffer>; degraded: boolean }>
  | 'not-found'
  | 'unavailable';

/**
 * The card's JPEG, cached per user + year + layout + theme:
 * the image is the same for every viewer. It lives as long as the page's
 * stats (`stats` profile) and carries the user's stats tags, so a mark that
 * changes the year expires this entry and the next request that reaches the
 * server redraws it. The CDN's copy is not purged (see `cardCacheControl`).
 *
 * Short-lived (`unavailable` profile): a failed read, an unknown user (a new
 * sign-up's card appears soon, as on the page) and a card drawn with a
 * failed poster (`degraded`), so a TMDB blip doesn't stick for a day.
 * Exactly one `cacheLife` per run.
 */
export async function renderCardImage(
  username: string,
  year: number,
  layout: CardLayoutName,
  theme: CardTheme,
): Promise<CardImageResult> {
  'use cache';
  cacheTag(tags.username(username));
  const data = await getCardData(username, year);
  if (data === 'unavailable') {
    cacheLife('unavailable');
    return data;
  }
  if (data.userId !== null) {
    cacheTag(tags.user(data.userId), tags.stats(data.userId));
  }
  if (data.status === 'not-found') {
    cacheLifeFor(data.userId === null ? 'unavailable' : 'stats');
    return data.status;
  }
  const { degraded, image } = await drawCard({
    colour: data.colour,
    layout,
    model: data.model,
    theme,
  });
  cacheLifeFor(degraded ? 'unavailable' : 'stats');
  return { degraded, image };
}
