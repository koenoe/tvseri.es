import { useMemo } from 'react';

import {
  getFlatLineY,
  getSharpSparklinePath,
  getSmoothSparklinePath,
  SPARKLINE_HEIGHT,
  SPARKLINE_WIDTH,
} from '@/lib/sparkline';

type LatencySparklineProps = Readonly<{
  series: ReadonlyArray<{ date: string; p75: number }> | undefined;
}>;

export function LatencySparkline({ series }: LatencySparklineProps) {
  const path = useMemo(() => {
    if (!series || series.length === 0) return '';
    return getSmoothSparklinePath(
      series.map((s) => s.p75),
      SPARKLINE_WIDTH,
      SPARKLINE_HEIGHT,
    );
  }, [series]);

  if (!path) return <div className="h-4 w-12" />;

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        className="stroke-muted-foreground/50"
        d={path}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

LatencySparkline.displayName = 'LatencySparkline';

type ErrorRateSparklineProps = Readonly<{
  errorRate: number;
  series:
    | ReadonlyArray<{ date: string; errorRate?: number; p75: number }>
    | undefined;
}>;

export function ErrorRateSparkline({
  errorRate,
  series,
}: ErrorRateSparklineProps) {
  const path = useMemo(() => {
    if (!series || series.length === 0) return '';
    const errorRates = series.map((s) => s.errorRate ?? 0);
    const hasVariation = errorRates.some((r) => r !== errorRates[0]);
    if (!hasVariation) return '';
    return getSharpSparklinePath(errorRates, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);
  }, [series]);

  if (!path) {
    const y = getFlatLineY(errorRate, 10);

    return (
      <svg
        aria-hidden="true"
        className="h-4 w-12"
        preserveAspectRatio="none"
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      >
        <line
          className="stroke-muted-foreground/50"
          strokeLinecap="round"
          strokeWidth="1.5"
          x1="0"
          x2={SPARKLINE_WIDTH}
          y1={y}
          y2={y}
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        className="stroke-muted-foreground/50"
        d={path}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

ErrorRateSparkline.displayName = 'ErrorRateSparkline';
