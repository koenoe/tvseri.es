import { MoreVertical } from 'lucide-react';
import { memo, type ReactNode, useMemo } from 'react';

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
import { type DependencyMetricItem, getLatencyStatus } from '@/lib/api-metrics';
import { getSmoothSparklinePath } from '@/lib/sparkline';
import { STATUS_COLORS } from '@/lib/status-colors';
import { DependencyLatencyPopover } from './dependency-latency-popover';

type LatencyCardProps = Readonly<{
  action?: ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
  p75: number;
  series: ReadonlyArray<{
    date: string;
    latency: {
      p75: number;
    };
  }>;
}>;

const LatencyCard = memo(function LatencyCard({
  action,
  dependencies,
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

    const line = getSmoothSparklinePath(points, width, height);
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
        <CardTitle>Latency</CardTitle>
        <CardDescription>75th Percentile Response Time</CardDescription>
        <CardAction>
          {action ?? (
            <DependencyLatencyPopover dependencies={dependencies}>
              <Button
                className="text-muted-foreground cursor-pointer data-[state=open]:bg-input/50"
                size="icon-sm"
                variant="ghost"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DependencyLatencyPopover>
          )}
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
          <div className="h-full w-full max-w-60 relative">
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
            className="text-muted-foreground"
            disabled
            size="icon-xs"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
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
          <Skeleton className="h-full w-full max-w-60 rounded-sm" />
        </div>
      </CardContent>
    </Card>
  );
}

LatencyCardSkeleton.displayName = 'LatencyCardSkeleton';

export { LatencyCard, LatencyCardSkeleton };
