'use client';

import { cx } from 'class-variance-authority';
import { useParams } from 'next/navigation';

type ComparisonData = {
  previousValue: string | number;
  delta: number;
  type: 'percentage' | 'absolute';
};

export default function Block({
  className,
  label,
  value,
  comparison,
}: Readonly<{
  className?: string;
  label: string;
  value: string | number;
  comparison: ComparisonData;
}>) {
  const params =
    useParams<
      Readonly<{
        year: string;
      }>
    >();
  const isPositiveDelta = comparison.delta > 0;

  const formatDelta = (delta: number, type: 'percentage' | 'absolute') => {
    const absoluteValue = Math.abs(delta);
    return type === 'percentage' ? `${absoluteValue}%` : absoluteValue;
  };

  const year = params.year
    ? parseInt(params.year, 10)
    : new Date().getFullYear();

  return (
    <div
      className={cx(
        'flex flex-col justify-center gap-y-1 whitespace-nowrap rounded-xl bg-[#333] p-3 md:gap-y-1.5 md:p-6',
        className,
      )}
    >
      <span className="text-[0.65rem] text-white/60 md:text-sm">{label}</span>
      <div className="flex items-center gap-x-2 leading-none">
        <span className="text-lg font-bold md:text-2xl">{value}</span>
        {comparison.delta !== 0 && (
          <span
            className={cx(
              'ml-1 flex items-center gap-x-0.5 text-xs font-semibold',
              isPositiveDelta ? 'text-[#00FFFF]' : 'text-[#FF0080]',
            )}
          >
            <svg
              className={cx(
                'size-3 shrink-0',
                isPositiveDelta ? 'rotate-[0deg]' : '-rotate-[180deg]',
              )}
              fill="currentColor"
              viewBox="0 0 32 32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.504 26.025l.001-14.287 6.366 6.367L26 15.979 15.997 5.975 6 15.971 8.129 18.1l6.366-6.368v14.291z" />
            </svg>
            {formatDelta(comparison.delta, comparison.type)}
          </span>
        )}
      </div>
      <span className="text-[0.65rem] text-white/30 md:text-xs">
        vs. {comparison.previousValue} ({year - 1})
      </span>
    </div>
  );
}
