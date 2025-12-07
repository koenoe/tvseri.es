export default function HistoryCardSkeleton({
  numberOfItems = 5,
}: Readonly<{ numberOfItems?: number }>) {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(numberOfItems)].map((_, index) => (
        <div
          className="relative flex w-full flex-row items-center gap-4 overflow-hidden rounded-xl bg-neutral-800 p-4"
          key={index}
        >
          {/* Poster skeleton */}
          <div className="h-[72px] w-12 flex-shrink-0 rounded-lg bg-white/10 md:h-24 md:w-16" />

          {/* Content skeleton */}
          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-5 w-32 bg-white/10 md:h-6 md:w-48" />
              <div className="size-6 flex-shrink-0 rounded bg-white/10 md:size-8" />
            </div>

            {/* Episode row */}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-6 w-14 flex-shrink-0 rounded-md bg-white/10" />
              <div className="h-4 w-24 bg-white/5 md:w-40" />
            </div>

            {/* Bottom row */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="h-4 w-16 bg-white/10" />
                <div className="h-4 w-10 bg-white/5" />
              </div>
              <div className="hidden h-5 w-28 rounded-md bg-white/5 md:block" />
            </div>
          </div>

          {/* Shimmer effect */}
          <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
      ))}
    </div>
  );
}
