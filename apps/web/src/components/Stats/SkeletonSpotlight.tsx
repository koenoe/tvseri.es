import { twMerge } from 'tailwind-merge';

export default function SkeletonSpotlight({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div className={twMerge('bg-white/5 rounded-xl overflow-clip', className)}>
      <div className="relative flex aspect-[16/14] flex-shrink-0 items-end md:aspect-[16/10] lg:aspect-[16/8] xl:aspect-[16/12] 2xl:aspect-[16/10]">
        <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
    </div>
  );
}
