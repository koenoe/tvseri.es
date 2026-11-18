import GuardedSection from '@/components/ui/row/GuardedSection';
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
        <GuardedSection
          fallback={<LensGridSkeleton />}
          id="lenses-grid"
          title="Lenses"
        >
          <LensPanels />
        </GuardedSection>
      </div>
      {LENS_ROWS.map((row) => {
        const skeleton = (
          <RowSkeleton id={row.key} look="hubOpen" title={row.title} />
        );
        return (
          <LensRowSlot key={row.key} row={row.key}>
            <GuardedSection
              fallback={skeleton}
              id={row.key}
              look="hubOpen"
              title={row.title}
            >
              <LensRow row={row.key} />
            </GuardedSection>
          </LensRowSlot>
        );
      })}
    </section>
  );
}
