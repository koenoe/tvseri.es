import type { TvSeries } from '@tvseri.es/schemas';
import { Suspense } from 'react';

import {
  LOWER_BAND,
  LOWER_BAND_INNER,
  STORYLINE_BOX,
  STORYLINE_GRID,
} from '../frames';
import Information from './Information';
import Keywords, { KeywordsSkeleton } from './Keywords';

/**
 * The lower band (ep0-lower): Storyline (the description in a
 * box, keywords beside it) and Information, on the page colour darkened 10%.
 */
export default function Storyline({ series }: Readonly<{ series: TvSeries }>) {
  return (
    <section className={LOWER_BAND} data-slot="lower-band">
      <div className={LOWER_BAND_INNER}>
        {series.description ? (
          <>
            <h2 className="mb-6 text-title-2">Storyline</h2>
            <div className={STORYLINE_GRID} data-slot="storyline-grid">
              <p className={STORYLINE_BOX}>{series.description}</p>
              <Suspense fallback={<KeywordsSkeleton />}>
                <Keywords seriesId={series.id} />
              </Suspense>
            </div>
          </>
        ) : null}
        <Information series={series} />
      </div>
    </section>
  );
}
