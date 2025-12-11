import { cx } from 'class-variance-authority';

export default function SkeletonBlock({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cx(
        'flex flex-col justify-center gap-y-1 whitespace-nowrap rounded-xl bg-[#333] p-3 md:gap-y-1.5 md:p-6',
        className,
      )}
    >
      <div className="h-4 w-16 animate-pulse bg-white/20 md:h-5 md:w-24" />
      <div className="h-7 w-28 animate-pulse bg-white/40 md:h-8 md:w-32" />
      <div className="h-4 w-20 animate-pulse bg-white/20 md:h-4 md:w-28" />
    </div>
  );
}
