import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';

export default function Loading() {
  return (
    <>
      <div className="flex gap-6 md:gap-10">
        <div className="h-[113px] w-[75px] flex-shrink-0 animate-pulse rounded-lg bg-white/5" />
        <div className="relative w-full">
          <div className="mb-2 h-7 w-48 animate-pulse bg-white/15 lg:h-8 lg:w-64" />
          <div className="h-5 w-64 animate-pulse bg-white/10" />
          <div className="mt-4 hidden w-full max-w-4xl md:block">
            <div className="h-4 w-full animate-pulse bg-white/5" />
            <div className="mt-1 h-4 w-3/4 animate-pulse bg-white/5" />
          </div>
          <div className="mt-4 flex gap-3">
            <SkeletonCircleButton />
            <SkeletonCircleButton />
          </div>
        </div>
      </div>
      <div className="mt-10 bg-neutral-900">
        <div className="flex animate-pulse flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              className="flex h-[7.5rem] flex-col gap-3 rounded-lg bg-white/5 p-6 md:h-[5.25rem] md:flex-row md:items-center"
              key={i}
            >
              <div className="h-6 w-32 bg-white/15" />
              <div className="h-8 w-full rounded bg-white/5 md:ml-auto md:w-48" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
