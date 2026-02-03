export default function SkeletonProfileForm() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="animate-pulse rounded-xl bg-neutral-800/50 p-8 lg:col-span-2">
        <div className="flex w-full flex-col gap-y-6">
          <div className="space-y-3">
            <div className="h-5 w-12 bg-white/10" />
            <div className="h-12 w-full rounded-lg bg-white/5" />
          </div>
          <div className="space-y-3">
            <div className="h-5 w-20 bg-white/10" />
            <div className="h-12 w-full rounded-lg bg-white/5" />
          </div>
          <div className="space-y-3">
            <div className="h-5 w-14 bg-white/10" />
            <div className="h-12 w-full rounded-lg bg-white/5" />
          </div>
          <div className="h-11 w-full rounded-lg bg-white/10 lg:max-w-48" />
        </div>
      </div>
    </div>
  );
}
