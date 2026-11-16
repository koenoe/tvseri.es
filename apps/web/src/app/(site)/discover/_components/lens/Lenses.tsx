import { Suspense } from 'react';

import RowErrorBoundary from '@/components/ui/row/RowErrorBoundary';
import RowSkeleton from '@/components/ui/row/RowSkeleton';

import { LENS_ROWS } from '../../_data/lenses';
import LensGridSkeleton from './LensGridSkeleton';
import LensPanels from './LensPanels';
import LensRow from './LensRow';
import LensRowSlot from './LensRowSlot';
import LensTabBar from './LensTabBar';

/**
 * The lens tabs and their tiles: Country,
 * Language, Network and Theme tiles open their landing; Duration and Decade
 * tiles open their shows here, under the grid.
 */
export default function Lenses() {
  return (
    <section aria-label="Lenses" className="scroll-mt-24" id="lenses">
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter">
        <LensTabBar />
        <RowErrorBoundary id="lenses-grid" title="Lenses">
          <Suspense fallback={<LensGridSkeleton />}>
            <LensPanels />
          </Suspense>
        </RowErrorBoundary>
      </div>
      {LENS_ROWS.map((row) => (
        <LensRowSlot key={row.key} row={row.key}>
          <RowErrorBoundary id={row.key} look="hubOpen" title={row.title}>
            <Suspense
              fallback={
                <RowSkeleton id={row.key} look="hubOpen" title={row.title} />
              }
            >
              <LensRow row={row.key} />
            </Suspense>
          </RowErrorBoundary>
        </LensRowSlot>
      ))}
    </section>
  );
}
