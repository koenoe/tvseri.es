import type { TmdbDiscoverQuery } from '@tvseri.es/schemas';
import { Suspense } from 'react';

import DiscoverGrid from '@/components/Grid/DiscoverGrid';
import SkeletonGrid from '@/components/Skeletons/SkeletonGrid';

export default async function DiscoverPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<TmdbDiscoverQuery>;
}>) {
  return (
    <Suspense fallback={<SkeletonGrid />}>
      <DiscoverGrid searchParams={searchParams} />
    </Suspense>
  );
}
