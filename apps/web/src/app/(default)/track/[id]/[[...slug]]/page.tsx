import { Suspense } from 'react';

import TrackDetailsContainer from '@/components/Track/TrackDetailsContainer';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

export default function TrackPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex animate-pulse gap-6 md:gap-10">
          <div className="h-[113px] w-[75px] flex-shrink-0 rounded-lg bg-white/5" />
          <div className="relative w-full">
            <div className="mb-2 h-6 w-48 bg-white/10" />
            <div className="h-4 w-32 bg-white/5" />
          </div>
        </div>
      }
    >
      <TrackDetailsContainer params={params} />
    </Suspense>
  );
}
