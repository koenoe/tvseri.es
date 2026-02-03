export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      <div className="h-12 w-full animate-pulse rounded-3xl bg-white/5" />
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-8">
        {[...Array(8)].map((_, index) => (
          <div className="flex flex-col gap-2" key={index}>
            <div className="relative w-full pt-[150%] animate-pulse rounded-lg bg-white/5" />
            <div className="h-4 w-3/4 animate-pulse bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
