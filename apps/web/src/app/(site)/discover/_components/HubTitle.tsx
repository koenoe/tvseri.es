import { Suspense } from 'react';

import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import RegionLine from './RegionLine';
import UpdatedLine from './UpdatedLine';

/** "Updated Nov 10" while the day is looked up: a bar the line's width (the last item of the row, so nothing beside it moves) */
function UpdatedGhost() {
  return (
    <span
      aria-hidden
      className={cn('h-3 w-31 rounded-4', GHOST_LOOK.loading)}
    />
  );
}

/**
 * Discover, one line about the lenses, and the region meta. Phones get
 * the shorter line and no meta.
 * The region line is the viewer's (a client piece); from the second visit
 * on the pre-paint hint draws it at first paint, so "Updated" never moves.
 */
export default function HubTitle() {
  return (
    <section
      aria-labelledby="discover-title"
      className="mx-auto flex w-full max-w-page flex-col gap-3 px-gutter"
    >
      <h1 className="font-display text-display" id="discover-title">
        Discover
      </h1>
      <p className="max-w-140 text-body-sm text-white/80 md:hidden">
        Browse TV by length, decade, country, language, network and themes.
      </p>
      <p className="max-w-140 text-body text-white/80 max-md:hidden">
        Browse TV by how long it is, when it was made, where it’s from, its
        language, its network and its themes.
      </p>
      <MetaRow className="min-h-6 text-body-sm max-md:hidden">
        <RegionLine />
        <Suspense fallback={<UpdatedGhost />}>
          <UpdatedLine />
        </Suspense>
      </MetaRow>
    </section>
  );
}
