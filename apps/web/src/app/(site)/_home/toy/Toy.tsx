import type { Toy as ToyData } from '@tvseri.es/schemas';

import ConnectedBy from './connected-by/ConnectedBy';
import ConnectedByToy from './connected-by/ConnectedByToy';
import Versus from './versus/Versus';
import WhatsOn from './whats-on/WhatsOn';
import WhereSet from './where-set/WhereSet';

/**
 * The toy of the day after Premieres (HMFinal "Moment rotation"): What's on,
 * Where are they set?, Connected by or Versus. Signed in, "If you liked X" takes the
 * slot on alternate days (`IfYouLiked`, chosen in page.tsx). With the
 * page's `day`, Connected by starts from the signed-in viewer's own shows
 * (`ConnectedByToy`); without it (the dev preview) it draws the paths given.
 */
export default function Toy({
  day,
  toy,
}: Readonly<{ day?: string; toy: ToyData }>) {
  switch (toy.kind) {
    case 'whats-on':
      return toy.channels.length > 0 ? (
        <WhatsOn channels={toy.channels} />
      ) : null;
    case 'where-set':
      return toy.places.length > 0 ? (
        <WhereSet featured={toy.featured} places={toy.places} />
      ) : null;
    case 'connected-by':
      if (toy.paths.length === 0) {
        return null;
      }
      return day ? (
        <ConnectedByToy day={day} paths={toy.paths} />
      ) : (
        <ConnectedBy paths={toy.paths} />
      );
    case 'versus':
      return toy.pairs.length > 0 ? <Versus pairs={toy.pairs} /> : null;
  }
}
