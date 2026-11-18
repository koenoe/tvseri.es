import { memo, useId, useMemo } from 'react';

import { getSmoothSparklinePath, toAreaPath } from '@/lib/sparkline';
import { cn } from '@/lib/utils';

type SparklineProps = Readonly<{
  className?: string;
  color: string;
  data: ReadonlyArray<number>;
  height?: number;
  strokeWidth?: number;
  width?: number;
}>;

const Sparkline = memo(function Sparkline({
  className,
  color,
  data,
  height = 20,
  strokeWidth = 1.5,
  width = 64,
}: SparklineProps) {
  const gradientId = useId();

  const { areaPath, linePath } = useMemo(() => {
    const line = getSmoothSparklinePath(data, width, height);
    const area = data.length > 0 ? toAreaPath(line, width, height) : '';

    return {
      areaPath: area,
      linePath: line,
    };
  }, [data, width, height]);

  if (data.length === 0) return null;

  const classes = cn('relative', className);
  return (
    <div className={classes} style={{ height, width }}>
      <svg
        aria-hidden="true"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    </div>
  );
});

Sparkline.displayName = 'Sparkline';

export { Sparkline };
