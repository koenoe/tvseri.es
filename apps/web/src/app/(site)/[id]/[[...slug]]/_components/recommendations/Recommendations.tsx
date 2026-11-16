import { Suspense } from 'react';

import Row from '@/components/ui/row/Row';
import RowErrorBoundary from '@/components/ui/row/RowErrorBoundary';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import SectionUnavailable from '@/components/ui/row/SectionUnavailable';
import PosterTile from '@/components/ui/tile/PosterTile';
import { isUnavailable } from '@/lib/cache/unavailable';

import { loadRecommendations } from '../../_data/loaders';

const ROW_ID = 'recommendations';
const TITLE = 'Recommendations';

/**
 * The row; while the API is unavailable (the short `unavailable` life), the shared
 * failed row with Try again (`SectionUnavailable`).
 */
export async function RecommendationsRow({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  const items = await loadRecommendations(seriesId);
  if (isUnavailable(items)) {
    return <SectionUnavailable id={ROW_ID} title={TITLE} />;
  }
  if (items.length === 0) {
    return null;
  }
  return (
    <Row id={ROW_ID} title={TITLE}>
      {items.map((item) => (
        <PosterTile
          id={item.id}
          key={item.id}
          poster={item.poster}
          slug={item.slug}
          title={item.title}
        />
      ))}
    </Row>
  );
}

/**
 * Recommendations: the shared row, title left and
 * two round arrows right, 220×330 posters at 1440. Nothing when TMDB has none.
 */
export default function Recommendations({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  return (
    <RowErrorBoundary id={ROW_ID} title={TITLE}>
      <Suspense fallback={<RowSkeleton id={ROW_ID} title={TITLE} />}>
        <RecommendationsRow seriesId={seriesId} />
      </Suspense>
    </RowErrorBoundary>
  );
}
