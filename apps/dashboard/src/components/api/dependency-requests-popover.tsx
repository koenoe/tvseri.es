import { memo, useMemo } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sparkline } from '@/components/ui/sparkline';
import {
  type DependencyMetricItem,
  formatCountString,
} from '@/lib/api-metrics';
import { DependencyBadge } from './dependency-badge';

type DependencyRequestsPopoverProps = Readonly<{
  children: React.ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
}>;

const NEUTRAL_COLOR = 'hsl(220, 9%, 70%)';

const RequestsSparkline = memo(function RequestsSparkline({
  history,
}: Readonly<{
  history: ReadonlyArray<{ timestamp: string; value: number }>;
}>) {
  const points = useMemo(() => history.map((s) => s.value), [history]);

  return (
    <Sparkline
      className="h-5 w-16"
      color={NEUTRAL_COLOR}
      data={points}
      height={20}
      strokeWidth={1.2}
      width={64}
    />
  );
});

RequestsSparkline.displayName = 'RequestsSparkline';

const DependencyRequestsPopover = memo(function DependencyRequestsPopover({
  children,
  dependencies,
}: DependencyRequestsPopoverProps) {
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
                    {formatCountString(dep.latency.count)}
                  </span>
                  {hasHistory && <RequestsSparkline history={dep.history} />}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});

DependencyRequestsPopover.displayName = 'DependencyRequestsPopover';

export { DependencyRequestsPopover };
