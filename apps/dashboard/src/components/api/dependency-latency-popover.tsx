import { memo, useMemo } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sparkline } from '@/components/ui/sparkline';
import {
  type DependencyMetricItem,
  formatLatency,
  getLatencyStatus,
} from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';
import { DependencyBadge } from './dependency-badge';

type DependencyLatencyPopoverProps = Readonly<{
  children: React.ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
}>;

const LatencySparkline = memo(function LatencySparkline({
  history,
  p75,
}: Readonly<{
  history: ReadonlyArray<{ timestamp: string; value: number }>;
  p75: number;
}>) {
  const status = getLatencyStatus(p75);
  const colorKey =
    status === 'fast' ? 'green' : status === 'moderate' ? 'amber' : 'red';
  const color = STATUS_COLORS[colorKey].hsl;

  const points = useMemo(() => history.map((s) => s.value), [history]);

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

LatencySparkline.displayName = 'LatencySparkline';

const DependencyLatencyPopover = memo(function DependencyLatencyPopover({
  children,
  dependencies,
}: DependencyLatencyPopoverProps) {
  if (!dependencies || dependencies.length === 0) {
    return <>{children}</>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-3 p-3">
          {dependencies.map((dep) => {
            const hasHistory = dep.history && dep.history.length > 1;
            return (
              <div
                className="flex items-center justify-between gap-4"
                key={dep.source}
              >
                <DependencyBadge name={dep.sourceName} />
                <div className="flex items-center gap-4">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatLatency(dep.latency.p75)}
                  </span>
                  {hasHistory && (
                    <LatencySparkline
                      history={dep.history}
                      p75={dep.latency.p75}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});

DependencyLatencyPopover.displayName = 'DependencyLatencyPopover';

export { DependencyLatencyPopover };
