import type { TvSeries } from '@tvseri.es/schemas';
import { Fragment } from 'react';

import TileLink from '@/components/ui/tile/TileLink';
import { PERSON_PREFETCH } from '@/components/ui/tile/tilePrefetch';
import cn from '@/lib/cn';
import personPath from '@/lib/routing/personPath';
import { CREATED_BY_LINE } from '../frames';

const LINE = cn('text-body-sm font-medium', CREATED_BY_LINE);

/** "Created by: Christopher Storer" (ep0-crd), links to people. */
export default function CreatedBy({
  creators,
}: Readonly<{ creators: TvSeries['createdBy'] }>) {
  if (creators.length === 0) {
    return null;
  }
  return (
    <p className={LINE}>
      <span className="text-white/60">Created by:</span>{' '}
      {creators.map((creator, index) => (
        <Fragment key={creator.id}>
          {index > 0 ? ', ' : null}
          <TileLink
            className="hover:underline"
            href={personPath(creator.id, creator.slug)}
            prefetchOn={PERSON_PREFETCH}
          >
            {creator.name}
          </TileLink>
        </Fragment>
      ))}
    </p>
  );
}
