import { cx } from 'class-variance-authority';

export default function SkeletonBlock({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cx(
        'flex flex-col justify-center gap-y-2 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-5 md:p-6',
        className,
      )}
    >
      <div className="h-4 w-2/4 animate-pulse bg-white/20" />
      <div className="h-6 w-full animate-pulse bg-white/40" />
    </div>
  );
}
