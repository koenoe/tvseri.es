import type { ConnectedPath } from '@tvseri.es/schemas';
import { Fragment } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { PersonNode, ShowNode } from './Nodes';

/**
 * A path: show, person, show, person, show with a line
 * and an arrow between each, 150px per node. On a phone the chain scrolls
 * sideways.
 */
/** The chain's line of nodes (scrolls sideways on a phone) */
export const CHAIN =
  '-mx-4 flex min-h-0 flex-1 items-start overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 md:pt-6 lg:overflow-visible';

export default function Chain({ path }: Readonly<{ path: ConnectedPath }>) {
  return (
    <div className={CHAIN}>
      {path.nodes.map((node, index) => {
        const nodeId =
          node.type === 'show' ? `s${node.series.id}` : `p${node.person.id}`;
        return (
          <Fragment key={nodeId}>
            {index > 0 ? <Line /> : null}
            {node.type === 'show' ? (
              <ShowNode series={node.series} />
            ) : (
              <PersonNode person={node.person} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/** The link's box between two nodes (its placeholder takes it too) */
export const LINK_BOX =
  'flex h-[126px] w-8 shrink-0 items-center md:w-auto md:min-w-5 md:flex-1';

function Line() {
  return (
    <span aria-hidden="true" className={LINK_BOX}>
      <i className="block h-0.5 flex-1 rounded-2 bg-white/18" />
      <Icon
        // contrast-exempt: a link icon
        className="-ml-[3px] size-3.5 text-white/40"
        glyph={chevronRightGlyph}
        size={16}
      />
    </span>
  );
}
