import { MoreVertical } from 'lucide-react';
import { memo, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sparkline } from '@/components/ui/sparkline';
import { formatLatency, getLatencyStatus } from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';

type PercentileData = Readonly<{
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}>;

type PercentileLatencyPopoverProps = Readonly<{
  series: ReadonlyArray<{
    latency: PercentileData;
  }>;
}>;

const PERCENTILES = ['p75', 'p90', 'p95', 'p99'] as const;

const PercentileSparkline = memo(function PercentileSparkline({
  points,
  value,
}: Readonly<{
  points: ReadonlyArray<number>;
  value: number;
}>) {
  const status = getLatencyStatus(value);
  const colorKey =
    status === 'fast' ? 'green' : status === 'moderate' ? 'amber' : 'red';
  const color = STATUS_COLORS[colorKey].hsl;

  return (
    <Sparkline
      className="h-5 w-16"
      color={color}
      data={points}
      height={20}
      strokeWidth={1.2}
      width={64}
    />
  );
});

PercentileSparkline.displayName = 'PercentileSparkline';

function PercentileLatencyPopoverComponent({
  series,
}: PercentileLatencyPopoverProps) {
  const percentileData = useMemo(() => {
    return PERCENTILES.map((percentile) => {
      const points = series.map((s) => s.latency[percentile]);
      const lastPoint = points.at(-1) ?? 0;
      return {
        label: percentile.toUpperCase(),
        percentile,
        points,
        value: lastPoint,
      };
    });
  }, [series]);

  const hasData = series.length > 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="text-muted-foreground cursor-pointer data-[state=open]:bg-input/50"
          size="icon-sm"
          variant="ghost"
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-3 p-3">
          {percentileData.map(({ label, percentile, points, value }) => (
            <div
              className="flex items-center justify-between gap-4"
              key={percentile}
            >
              <span className="flex cursor-default items-stretch justify-start rounded-sm border bg-background px-1.5 py-0.5">
                <span className="text-[12px] font-medium leading-4 text-muted-foreground">
                  {label}
                </span>
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatLatency(value)}
                </span>
                {hasData && (
                  <PercentileSparkline points={points} value={value} />
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

PercentileLatencyPopoverComponent.displayName = 'PercentileLatencyPopover';

export const PercentileLatencyPopover = memo(PercentileLatencyPopoverComponent);
