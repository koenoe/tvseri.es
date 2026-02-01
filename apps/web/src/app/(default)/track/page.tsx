import { Suspense } from 'react';

import TrackSearchContainer from '@/components/Track/TrackSearchContainer';

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
        </div>
      }
    >
      <TrackSearchContainer />
    </Suspense>
  );
}
