export default function SkeletonStreamingServices({
  numberOfItems = 10,
}: Readonly<{ numberOfItems?: number }>) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-neutral-900">
        <div className="flex h-[5.5rem] items-center justify-center rounded-lg bg-white/5 p-3">
          <div className="relative h-6 w-56 animate-pulse bg-white/10" />
        </div>
      </div>
      <div className="bg-neutral-900">
        <div className="flex h-[4.5rem] items-center justify-start gap-6 rounded-lg bg-white/5 px-6 py-3">
          <div className="size-6 animate-pulse rounded-full bg-white/10" />
          <div className="relative h-6 w-48 animate-pulse bg-white/5" />
        </div>
      </div>
      <div className="bg-neutral-900">
        <div className="rounded-lg bg-white/5 p-4 md:p-6">
          <div className="flex flex-col gap-2">
            {[...Array(numberOfItems)].map((_, index) => (
              <div
                className="relative flex flex-row gap-3 overflow-hidden rounded-lg bg-black/10 p-3 md:flex-row md:items-center md:gap-4 md:p-4"
                key={index}
              >
                <div className="relative aspect-square size-10 overflow-hidden rounded-md bg-white/10">
                  <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>
                <div className="h-5 w-32 animate-pulse bg-white/10" />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3 md:relative md:right-auto md:top-auto md:ml-auto md:-translate-y-0 md:gap-4">
                  <div className="h-8 w-16 animate-pulse rounded-2xl bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
