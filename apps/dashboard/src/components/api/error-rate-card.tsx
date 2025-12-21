import { MoreVertical } from 'lucide-react';
import { memo, type ReactNode } from 'react';

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
import { Button } from '../ui/button';
import { DependencyErrorPopover } from './dependency-error-popover';
import { SegmentedBar, type StatusColor } from './segmented-bar';

const BAR_COUNT = 32;
const MAX_ERROR_RATE = 10;

type ErrorRateCardProps = Readonly<{
  action?: ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
  errorRate: number;
}>;

function getErrorRateColor(errorRate: number): StatusColor {
  if (errorRate < 1) return 'green';
  if (errorRate < 5) return 'amber';
  return 'red';
}

const ErrorRateCard = memo(function ErrorRateCard({
  action,
  dependencies,
  errorRate,
}: ErrorRateCardProps) {
  const color = getErrorRateColor(errorRate);
  const filledBars = Math.round(
    (Math.min(errorRate, MAX_ERROR_RATE) / MAX_ERROR_RATE) * BAR_COUNT,
  );

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle>Error Rate</CardTitle>
        <CardDescription>Percentage of Failed Requests</CardDescription>
        <CardAction>
          {action ?? (
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
          <SegmentedBar
            barCount={BAR_COUNT}
            color={color}
            filledBars={filledBars}
          />
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
