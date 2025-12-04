import { Suspense } from 'react';

import { getStatsCountries } from '@/lib/api';

import WorldMap from './WorldMap';

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

export default async function WorldMapContainer({ userId, year }: Input) {
  const data = await getStatsCountries({ userId, year });

  return (
    <Suspense fallback={<div className="relative aspect-[192/95] w-full" />}>
      <WorldMap data={data} />
    </Suspense>
  );
}
