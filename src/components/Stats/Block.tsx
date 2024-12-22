import { cx } from 'class-variance-authority';

export default function Block({
  className,
  label,
  value,
}: Readonly<{
  className?: string;
  label: string;
  value: string | number;
}>) {
  return (
    <div
      className={cx(
        'flex flex-col justify-center gap-y-1 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-2 md:p-6',
        className,
      )}
    >
      <span className="text-[0.65rem] text-white/60 md:text-sm">{label}</span>
      <span className="text-lg font-semibold md:text-2xl">{value}</span>
    </div>
  );
}
