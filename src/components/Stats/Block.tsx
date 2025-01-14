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
  const params = useParams<
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
        'flex flex-col justify-center gap-y-1 whitespace-nowrap rounded bg-[#333] p-3 md:gap-y-1.5 md:p-6',
        className,
      )}
    >
      <span className="text-[0.65rem] text-white/60 md:text-sm">{label}</span>
      <div className="flex items-center gap-x-2">
        <span className="text-lg font-bold md:text-2xl">{value}</span>
        {comparison.delta !== 0 && (
          <span
            className={cx(
              'ml-1 flex items-center gap-x-0.5 text-xs font-semibold',
              isPositiveDelta ? 'text-[#00FFFF]' : 'text-[#FF0080]',
            )}
          >
            <svg
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={cx(
                'size-3 shrink-0',
                isPositiveDelta ? '-rotate-[270deg]' : '-rotate-[90deg]',
              )}
            >
              <path
                d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
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
