import { ERROR_RATE_CEILING } from '@/lib/api-metrics';
import {
  getFlatLineY,
  getSharpSparklinePath,
  getSmoothSparklinePath,
  SPARKLINE_HEIGHT,
  SPARKLINE_WIDTH,
} from '@/lib/sparkline';

const VIEW_BOX = `0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`;
const MUTED_STROKE = 'stroke-muted-foreground/50';

type SparklineProps = Readonly<{
  /** A status colour; without one the line is muted. */
  color?: string;
  values: ReadonlyArray<number> | undefined;
}>;

function TrendPath({ color, d }: Readonly<{ color?: string; d: string }>) {
  const className = color ? undefined : MUTED_STROKE;
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={VIEW_BOX}
    >
      <path
        className={className}
        d={d}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function LatencySparkline({ color, values }: SparklineProps) {
  const path = values?.length ? getSmoothSparklinePath(values) : '';
  if (!path) return <div className="h-4 w-12" />;
  return <TrendPath color={color} d={path} />;
}

LatencySparkline.displayName = 'LatencySparkline';

function hasVariation(values: ReadonlyArray<number>): boolean {
  return values.some((value) => value !== values[0]);
}

// A series without variation draws a flat line at the rate's own height.
export function ErrorRateSparkline({
  color,
  errorRate,
  values,
}: SparklineProps & Readonly<{ errorRate: number }>) {
  if (values?.length && hasVariation(values)) {
    const path = getSharpSparklinePath(values);
    return <TrendPath color={color} d={path} />;
  }

  const y = getFlatLineY(errorRate, ERROR_RATE_CEILING);
  const className = color ? undefined : MUTED_STROKE;
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12"
      preserveAspectRatio="none"
      viewBox={VIEW_BOX}
    >
      <line
        className={className}
        stroke={color}
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

ErrorRateSparkline.displayName = 'ErrorRateSparkline';
