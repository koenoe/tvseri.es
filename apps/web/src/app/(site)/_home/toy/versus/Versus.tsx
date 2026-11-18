import type { VersusPair } from '@tvseri.es/schemas';

import VersusDeck from './VersusDeck';

/**
 * Versus, the toy of the day: one client island, the
 * card and its interaction; the deck is a few small pairs.
 */
export default function Versus({
  pairs,
}: Readonly<{ pairs: ReadonlyArray<VersusPair> }>) {
  return <VersusDeck pairs={pairs} />;
}
