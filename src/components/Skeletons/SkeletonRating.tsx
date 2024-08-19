import { cx } from 'class-variance-authority';

export default function SkeletonRating({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div className="h-6 w-6 animate-pulse rounded-full bg-white/30" />
      <div className="flex flex-col gap-1">
        <div className="h-6 w-[69px] bg-white/20" />
        <div className="h-3 w-12 bg-white/10" />
      </div>
    </div>
  );
}
