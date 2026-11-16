import 'server-only';

import { getCardData } from '../../_card/cardData';
import { cardDescription } from '../../_card/cardModel';
import { cardColour } from '../../_card/theme';
import type { StatsUser } from '../../_data/loaders';
import type { ShareCard } from './shareCard';

/**
 * The share UI's props, from the card's own (cached) data: the Colour
 * swatch is the top of the card's Colour ground, the description the card
 * in words. Without the data the swatch is the board's blue.
 */
export async function getShareCard(
  user: StatsUser,
  year: number,
): Promise<ShareCard> {
  const data = await getCardData(user.username, year);
  const ready = data !== 'unavailable' && data.status === 'ready';
  return {
    description: ready
      ? cardDescription(data.model)
      : `${user.username}’s ${year} on tvseri.es.`,
    swatch: cardColour(ready ? data.colour : null),
    username: user.username,
    year,
  };
}
