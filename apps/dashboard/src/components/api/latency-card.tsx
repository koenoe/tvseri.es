import { MoreVertical } from 'lucide-react';
import { memo, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getLatencyStatus } from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';

type LatencyCardProps = Readonly<{
  p75: number;
  series: ReadonlyArray<{
    date: string;
    latency: {
      p75: number;
    };
  }>;
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

const LatencyCard = memo(function LatencyCard({
  p75,
  series,
}: LatencyCardProps) {
  const status = getLatencyStatus(p75);
  const colorKey =
    status === 'fast' ? 'green' : status === 'moderate' ? 'amber' : 'red';

  const { linePath, areaPath, color } = useMemo(() => {
    const points = series.map((s) => s.latency.p75);
    const width = 200;
    const height = 100;

    const line = getPath(points, width, height);
    const area =
      points.length > 0 ? `${line} L ${width},${height} L 0,${height} Z` : '';

    const statusColor = STATUS_COLORS[colorKey];

    return {
      areaPath: area,
      color: statusColor.hsl,
      linePath: line,
    };
  }, [series, colorKey]);

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle>Latency (p75)</CardTitle>
        <CardDescription>75th Percentile Response Time</CardDescription>
        <CardAction>
          <Button
            className="size-5 text-muted-foreground cursor-pointer"
            variant="ghost"
          >
            <MoreVertical />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="@container flex items-center justify-between gap-6 lg:gap-10">
        <div className="text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold text-foreground shrink-0">
          {p75 < 1000 ? Math.round(p75) : (p75 / 1000).toFixed(2)}
          <span className="text-[0.4em] font-light ml-1 text-muted-foreground/60">
            {p75 < 1000 ? 'ms' : 's'}
          </span>
        </div>

        <div className="flex-1 h-14 min-w-0 flex justify-end">
          <div className="h-full w-full max-w-50 relative">
            <svg
              aria-hidden="true"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 200 100"
            >
              <defs>
                <linearGradient
                  id={`gradient-${colorKey}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#gradient-${colorKey})`} />
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

LatencyCard.displayName = 'LatencyCard';

function LatencyCardSkeleton() {
  return (
    <Card className="w-full border">
      <CardHeader>
        <Skeleton className="h-4 w-28 rounded-none bg-white/40" />
        <Skeleton className="h-3.5 w-48 rounded-none" />
        <CardAction>
          <Button
            className="size-5 text-muted-foreground"
            disabled
            variant="ghost"
          >
            <MoreVertical />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="@container flex items-center justify-between gap-6 lg:gap-10">
        <Skeleton className="text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold shrink-0 rounded-none bg-white/40">
          <span className="invisible">
            000<span className="text-[0.4em] font-light ml-1">ms</span>
          </span>
        </Skeleton>
        <div className="flex-1 h-14 min-w-0 flex justify-end">
          <Skeleton className="h-full w-full max-w-50 rounded-sm" />
        </div>
      </CardContent>
    </Card>
  );
}

LatencyCardSkeleton.displayName = 'LatencyCardSkeleton';

export { LatencyCard, LatencyCardSkeleton };
