import { memo, useId, useMemo } from 'react';

import { cn } from '@/lib/utils';

type SparklineProps = Readonly<{
  className?: string;
  color: string;
  data: ReadonlyArray<number>;
  height?: number;
  strokeWidth?: number;
  width?: number;
}>;

const getPath = (
  points: ReadonlyArray<number>,
  width: number,
  height: number,
) => {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M 0,${height / 2} L ${width},${height / 2}`;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const normalizedVal = (val - min) / range;
    const y = height - (normalizedVal * (height * 0.8) + height * 0.1);
    return [x, y] as const;
  });

  const firstPoint = coords[0];
  if (!firstPoint) return '';

  let d = `M ${firstPoint[0].toFixed(1)},${firstPoint[1].toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(i - 1, 0)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(i + 2, coords.length - 1)];

    if (!p0 || !p1 || !p2 || !p3) continue;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;

    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  return d;
};

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
    const line = getPath(data, width, height);
    const area =
      data.length > 0 ? `${line} L ${width},${height} L 0,${height} Z` : '';

    return {
      areaPath: area,
      linePath: line,
    };
  }, [data, width, height]);

  if (data.length === 0) return null;

  return (
    <div className={cn('relative', className)} style={{ height, width }}>
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
