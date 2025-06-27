import SkeletonCircleButton from '../Skeletons/SkeletonCircleButton';

export default function SkeletonCard({
  numberOfItems = 5,
}: Readonly<{ numberOfItems?: number }>) {
  return (
    <div className="rounded-lg bg-white/5 p-4 md:p-6">
      <div className="h-7 w-52 bg-white/20" />
      <div className="flex flex-col gap-2 pt-4 md:pt-6">
        {[...Array(numberOfItems)].map((_, index) => (
          <div
            className="relative flex flex-row gap-3 overflow-hidden rounded-lg bg-black/10 p-3 md:flex-row md:items-center md:gap-4 md:p-4"
            key={index}
          >
            <div className="flex flex-col gap-3">
              <div className="h-5 w-40 bg-white/10" />
              <div className="h-3 w-48 bg-white/5" />
            </div>
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3 md:relative md:right-auto md:top-auto md:ml-auto md:-translate-y-0 md:gap-4">
              <SkeletonCircleButton size="small" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
