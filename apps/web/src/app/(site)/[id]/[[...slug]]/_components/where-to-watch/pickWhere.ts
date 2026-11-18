import type { WatchProvider } from '@tvseri.es/schemas';

import { foldPlan, yourService } from '@/lib/watchProviders/yourService';

/**
 * Where to watch: one answer per show
 * and region. One of the viewer's services first, the first in their own
 * order that streams it ("On your Disney+"), else
 * the first service it streams on ("Disney+"), else where to rent or buy it,
 * quietly ("Buy on Apple TV Store"), else nothing. Never "not on your
 * services".
 */

export type WhereOffers = Readonly<{
  /** Subscription and free streams, in the API's order. */
  stream: ReadonlyArray<WatchProvider>;
  rent?: ReadonlyArray<WatchProvider>;
  buy?: ReadonlyArray<WatchProvider>;
}>;

export type Where = Readonly<{
  kind: 'yours' | 'stream' | 'rent' | 'buy';
  /** The service's name with plans folded ("Netflix", not "Netflix Standard with Ads"). */
  name: string;
  logo: string;
  /** "On your Netflix", "Netflix", "Rent on …", "Buy on …". */
  text: string;
}>;

export function pickWhere(
  offers: WhereOffers,
  services: ReadonlyArray<Pick<WatchProvider, 'id' | 'name'>>,
): Where | null {
  const yours = yourService(offers.stream, services);
  if (yours) {
    const name = foldPlan(yours.name);
    return { kind: 'yours', logo: yours.logo, name, text: `On your ${name}` };
  }
  const stream = offers.stream[0];
  if (stream) {
    const name = foldPlan(stream.name);
    return { kind: 'stream', logo: stream.logo, name, text: name };
  }
  const rent = offers.rent?.[0];
  if (rent) {
    const name = foldPlan(rent.name);
    return { kind: 'rent', logo: rent.logo, name, text: `Rent on ${name}` };
  }
  const buy = offers.buy?.[0];
  if (buy) {
    const name = foldPlan(buy.name);
    return { kind: 'buy', logo: buy.logo, name, text: `Buy on ${name}` };
  }
  return null;
}
