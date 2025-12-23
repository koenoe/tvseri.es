import { MoreVertical } from 'lucide-react';
import { memo, type ReactNode, useMemo } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DependencyMetricItem } from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';
import { Button } from '../ui/button';
import { DependencyErrorPopover } from './dependency-error-popover';
import { SegmentedBar, type StatusColor } from './segmented-bar';

const BAR_COUNT = 32;
const MAX_ERROR_RATE = 10;

type ErrorRateSeriesItem = Readonly<{
  date: string;
  errorRate?: number;
}>;

type ErrorRateCardProps = Readonly<{
  action?: ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
  errorRate: number;
  series?: ReadonlyArray<ErrorRateSeriesItem>;
}>;

function getErrorRateColor(errorRate: number): StatusColor {
  if (errorRate < 1) return 'green';
  if (errorRate < 5) return 'amber';
  return 'red';
}

function getSharpSparklinePath(
  points: ReadonlyArray<number>,
  width: number,
  height: number,
): string {
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
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${coords.join(' L ')}`;
}

const ErrorRateCard = memo(function ErrorRateCard({
  action,
  dependencies,
  errorRate,
  series,
}: ErrorRateCardProps) {
  const color = getErrorRateColor(errorRate);
  const filledBars = Math.round(
    (Math.min(errorRate, MAX_ERROR_RATE) / MAX_ERROR_RATE) * BAR_COUNT,
  );

  const sparklineData = useMemo(() => {
    if (!series || series.length === 0) return null;

    const errorRates = series.map((s) => s.errorRate ?? 0);
    const hasVariation = errorRates.some((r) => r !== errorRates[0]);

    const width = 200;
    const height = 100;

    const linePath = hasVariation
      ? getSharpSparklinePath(errorRates, width, height)
      : `M 0,${height / 2} L ${width},${height / 2}`;

    const areaPath =
      errorRates.length > 0
        ? `${linePath} L ${width},${height} L 0,${height} Z`
        : '';

    const strokeColor = STATUS_COLORS[color].hsl;

    return { areaPath, linePath, strokeColor };
  }, [color, series]);

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle>Error Rate</CardTitle>
        <CardDescription>Percentage of Failed Requests</CardDescription>
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
            <DependencyErrorPopover dependencies={dependencies}>
              <Button
                className="text-muted-foreground cursor-pointer data-[state=open]:bg-muted"
                size="icon-sm"
                variant="ghost"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DependencyErrorPopover>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="@container flex items-center justify-between gap-6 lg:gap-10">
        <div className="text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold text-foreground shrink-0 tabular-nums">
          {errorRate.toFixed(2)}
          <span className="text-[0.4em] font-light ml-1 text-muted-foreground/60">
            %
          </span>
        </div>

        <div className="flex-1 h-14 min-w-0 flex justify-end items-center">
          {sparklineData ? (
            <div className="h-full w-full max-w-60 relative">
              <svg
                aria-hidden="true"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 200 100"
              >
                <defs>
                  <linearGradient
                    id={`error-gradient-${color}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={sparklineData.strokeColor}
                      stopOpacity="0.25"
                    />
                    <stop
                      offset="100%"
                      stopColor={sparklineData.strokeColor}
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <path
                  d={sparklineData.areaPath}
                  fill={`url(#error-gradient-${color})`}
                />
                <path
                  d={sparklineData.linePath}
                  fill="none"
                  stroke={sparklineData.strokeColor}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth="2"
                />
              </svg>
            </div>
          ) : (
            <SegmentedBar
              barCount={BAR_COUNT}
              color={color}
              filledBars={filledBars}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ErrorRateCard.displayName = 'ErrorRateCard';

function ErrorRateCardSkeleton() {
  return (
    <Card className="w-full border">
      <CardHeader>
        <Skeleton className="h-4 w-24 rounded-none bg-white/40" />
        <Skeleton className="h-3.5 w-44 rounded-none" />
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
            0.00<span className="text-[0.4em] font-light ml-1">%</span>
          </span>
        </Skeleton>
        <div className="flex-1 h-14 min-w-0 flex justify-end items-center">
          <SegmentedBar barCount={BAR_COUNT} color="green" filledBars={0} />
        </div>
      </CardContent>
    </Card>
  );
}

ErrorRateCardSkeleton.displayName = 'ErrorRateCardSkeleton';

export { ErrorRateCard, ErrorRateCardSkeleton };
