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
import { type DependencyMetricItem, formatCount } from '@/lib/api-metrics';
import { getSmoothSparklinePath } from '@/lib/sparkline';
import { DependencyRequestsPopover } from './dependency-requests-popover';

const formatRpm = (rpm: number): string => {
  return `~${Math.round(rpm)}/min avg`;
};

type RequestsCardProps = Readonly<{
  action?: ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
  requestCount: number;
  series: ReadonlyArray<{
    date: string;
    requestCount: number;
  }>;
  throughput: number;
}>;

const NEUTRAL_COLOR = 'hsl(220, 9%, 70%)';

const RequestsCard = memo(function RequestsCard({
  action,
  dependencies,
  requestCount,
  series,
  throughput,
}: RequestsCardProps) {
  const { areaPath, linePath } = useMemo(() => {
    const points = series.map((s) => s.requestCount);
    const width = 200;
    const height = 100;

    const line = getSmoothSparklinePath(points, width, height);
    const area =
      points.length > 0 ? `${line} L ${width},${height} L 0,${height} Z` : '';

    return {
      areaPath: area,
      linePath: line,
    };
  }, [series]);

  const { unit, value } = formatCount(requestCount);

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle>Requests</CardTitle>
        <CardDescription>{formatRpm(throughput)}</CardDescription>
        <CardAction>
          {action === null ? (
            <Button
              className="text-muted-foreground"
              disabled
              size="icon-sm"
              variant="ghost"
            >
              <MoreVertical className="size-4" />
            </Button>
          ) : action !== undefined ? (
            action
          ) : (
            <DependencyRequestsPopover dependencies={dependencies}>
              <Button
                className="text-muted-foreground cursor-pointer data-[state=open]:bg-input/50"
                size="icon-sm"
                variant="ghost"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DependencyRequestsPopover>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="@container flex items-center justify-between gap-6 lg:gap-10">
        <div className="text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold text-foreground shrink-0">
          {value}
          {unit && (
            <span className="text-[0.4em] font-light ml-1 text-muted-foreground/60">
              {unit}
            </span>
          )}
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
                  id="gradient-neutral"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={NEUTRAL_COLOR}
                    stopOpacity="0.25"
                  />
                  <stop
                    offset="100%"
                    stopColor={NEUTRAL_COLOR}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#gradient-neutral)" />
              <path
                d={linePath}
                fill="none"
                stroke={NEUTRAL_COLOR}
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

RequestsCard.displayName = 'RequestsCard';

function RequestsCardSkeleton() {
  return (
    <Card className="w-full border">
      <CardHeader>
        <Skeleton className="h-4 w-20 rounded-none bg-white/40" />
        <Skeleton className="h-3.5 w-16 rounded-none" />
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
            00.0<span className="text-[0.4em] font-light ml-1">k</span>
          </span>
        </Skeleton>
        <div className="flex-1 h-14 min-w-0 flex justify-end">
          <Skeleton className="h-full w-full max-w-60 rounded-sm" />
        </div>
      </CardContent>
    </Card>
  );
}

RequestsCardSkeleton.displayName = 'RequestsCardSkeleton';

export { RequestsCard, RequestsCardSkeleton };
