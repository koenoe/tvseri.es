export default function HistoryCardSkeleton({
  numberOfItems = 2,
}: Readonly<{ numberOfItems?: number }>) {
  return (
    <div className="relative -ml-4 w-[calc(100%+1rem)] md:ml-0 md:w-full">
      <div className="relative pb-10">
        {/* Timeline entries */}
        {[...Array(numberOfItems)].map((_, index) => (
          <div
            className="flex justify-start gap-4 pt-10 md:gap-8 md:pt-16"
            key={index}
          >
            {/* Left column: dot + title */}
            <div className="flex w-10 flex-shrink-0 flex-row items-start md:w-48">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900">
                <div className="h-4 w-4 rounded-full border border-neutral-700 bg-neutral-800" />
              </div>
              {/* Title skeleton - desktop only */}
              <div className="hidden py-2 pl-4 md:block">
                <div className="h-6 w-24 animate-pulse bg-white/10" />
              </div>
            </div>

            {/* Right column: content */}
            <div className="relative min-w-0 flex-1">
              {/* Title skeleton - mobile only */}
              <div className="mb-4 flex h-10 items-center md:hidden">
                <div className="h-6 w-24 animate-pulse bg-white/10" />
              </div>

              {/* Cards container with gap-4 like HistoryCardStack */}
              <div className="flex flex-col gap-4">
                {/* Card skeleton 1 */}
                <div className="relative flex w-full flex-row items-center gap-4 overflow-hidden rounded-xl bg-neutral-800 p-4">
                  {/* Poster skeleton */}
                  <div className="h-[72px] w-12 flex-shrink-0 animate-pulse rounded-lg bg-white/10 md:h-24 md:w-16" />

                  {/* Content skeleton */}
                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-5 w-32 animate-pulse bg-white/10 md:h-6 md:w-48" />
                      <div className="size-6 flex-shrink-0 animate-pulse rounded bg-white/10 md:size-8" />
                    </div>

                    {/* Episode row */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-6 w-14 flex-shrink-0 animate-pulse rounded-md bg-white/10" />
                      <div className="h-4 w-24 animate-pulse bg-white/5 md:w-40" />
                    </div>

                    {/* Bottom row */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <div className="h-4 w-16 animate-pulse bg-white/10" />
                        <div className="h-4 w-10 animate-pulse bg-white/5" />
                      </div>
                      <div className="hidden h-5 w-28 animate-pulse rounded-md bg-white/5 md:block" />
                    </div>
                  </div>
                </div>

                {/* Card skeleton 2 */}
                <div className="relative flex w-full flex-row items-center gap-4 overflow-hidden rounded-xl bg-neutral-800 p-4">
                  {/* Poster skeleton */}
                  <div className="h-[72px] w-12 flex-shrink-0 animate-pulse rounded-lg bg-white/10 md:h-24 md:w-16" />

                  {/* Content skeleton */}
                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-5 w-28 animate-pulse bg-white/10 md:h-6 md:w-40" />
                      <div className="size-6 flex-shrink-0 animate-pulse rounded bg-white/10 md:size-8" />
                    </div>

                    {/* Episode row */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-6 w-14 flex-shrink-0 animate-pulse rounded-md bg-white/10" />
                      <div className="h-4 w-20 animate-pulse bg-white/5 md:w-32" />
                    </div>

                    {/* Bottom row */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <div className="h-4 w-14 animate-pulse bg-white/10" />
                        <div className="h-4 w-12 animate-pulse bg-white/5" />
                      </div>
                      <div className="hidden h-5 w-24 animate-pulse rounded-md bg-white/5 md:block" />
                    </div>
                  </div>
                </div>

                {/* Card skeleton 3 */}
                <div className="relative flex w-full flex-row items-center gap-4 overflow-hidden rounded-xl bg-neutral-800 p-4">
                  {/* Poster skeleton */}
                  <div className="h-[72px] w-12 flex-shrink-0 animate-pulse rounded-lg bg-white/10 md:h-24 md:w-16" />

                  {/* Content skeleton */}
                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-5 w-36 animate-pulse bg-white/10 md:h-6 md:w-52" />
                      <div className="size-6 flex-shrink-0 animate-pulse rounded bg-white/10 md:size-8" />
                    </div>

                    {/* Episode row */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-6 w-14 flex-shrink-0 animate-pulse rounded-md bg-white/10" />
                      <div className="h-4 w-28 animate-pulse bg-white/5 md:w-36" />
                    </div>

                    {/* Bottom row */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <div className="h-4 w-12 animate-pulse bg-white/10" />
                        <div className="h-4 w-10 animate-pulse bg-white/5" />
                      </div>
                      <div className="hidden h-5 w-32 animate-pulse rounded-md bg-white/5 md:block" />
                    </div>
                  </div>
                </div>

                {/* Card skeleton 4 */}
                <div className="relative flex w-full flex-row items-center gap-4 overflow-hidden rounded-xl bg-neutral-800 p-4">
                  {/* Poster skeleton */}
                  <div className="h-[72px] w-12 flex-shrink-0 animate-pulse rounded-lg bg-white/10 md:h-24 md:w-16" />

                  {/* Content skeleton */}
                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-5 w-24 animate-pulse bg-white/10 md:h-6 md:w-36" />
                      <div className="size-6 flex-shrink-0 animate-pulse rounded bg-white/10 md:size-8" />
                    </div>

                    {/* Episode row */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-6 w-14 flex-shrink-0 animate-pulse rounded-md bg-white/10" />
                      <div className="h-4 w-16 animate-pulse bg-white/5 md:w-28" />
                    </div>

                    {/* Bottom row */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <div className="h-4 w-18 animate-pulse bg-white/10" />
                        <div className="h-4 w-8 animate-pulse bg-white/5" />
                      </div>
                      <div className="hidden h-5 w-26 animate-pulse rounded-md bg-white/5 md:block" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Timeline beam track (static background line) */}
        <div className="absolute left-[19px] top-0 h-full w-[2px] bg-neutral-800" />
      </div>
    </div>
  );
}
