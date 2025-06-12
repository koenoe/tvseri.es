import { cx } from 'class-variance-authority';

export default function SkeletonSpotlight({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cx(
        'relative flex aspect-[16/14] flex-shrink-0 items-end overflow-clip rounded shadow-lg md:aspect-[16/10] lg:aspect-[16/8] xl:aspect-[16/12] 2xl:aspect-[16/10]',
        className,
      )}
    >
      <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}
