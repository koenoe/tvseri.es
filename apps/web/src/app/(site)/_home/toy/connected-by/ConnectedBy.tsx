import type { ConnectedPath } from '@tvseri.es/schemas';

import { routeGlyph } from '@/components/ui/icon/glyphs';

import { MomentFrame } from '../../feature/Moment';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { TOY_TITLE } from '../../moments';
import Chain from './Chain';
import { pathTitle } from './copy';
import { CONNECTED_CARD, PATH_LABEL } from './layout';
import PathSwitcher from './PathSwitcher';
import { endOf, startOf } from './viewerPaths';

/** One Connected by per page: its label names the section */
const LABEL_ID = 'connected-by-label';

const titleOf = (path: ConnectedPath) =>
  pathTitle(startOf(path)?.title ?? '', endOf(path)?.title ?? '');

/** The end, only what its Watchlist needs crosses to the client */
const endRefOf = (path: ConnectedPath) => {
  const end = endOf(path);
  return { id: end?.id ?? 0, title: end?.title ?? '' };
};

/**
 * Connected by (HMFinal `e2-card e2-gr`): a start show linked through two
 * people and a show in between to a show to discover, "{A} to {B}, in 2
 * steps", with the end's Watchlist and "Another path" cycling through the
 * paths. No title above the block: the card's head starts with its label
 * (the section's heading). The chains are rendered here; the switcher
 * island only says which one shows.
 */
export default function ConnectedBy({
  paths,
}: Readonly<{ paths: ReadonlyArray<ConnectedPath> }>) {
  const titles = paths.map(titleOf);
  const ends = paths.map(endRefOf);
  const chains = paths.map((path, index) => (
    <Chain key={titles[index]} path={path} />
  ));
  const label = (
    <MomentLabel
      className={PATH_LABEL}
      glyph={routeGlyph}
      id={LABEL_ID}
      title={TOY_TITLE['connected-by']}
    />
  );
  return (
    <MomentFrame name="toy">
      <div className={PAGE_COLUMN}>
        <section aria-labelledby={LABEL_ID} className={CONNECTED_CARD}>
          <PathSwitcher
            chains={chains}
            ends={ends}
            label={label}
            titles={titles}
          />
        </section>
      </div>
    </MomentFrame>
  );
}
