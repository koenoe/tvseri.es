import { MoreVertical } from 'lucide-react';
import { memo } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';

const BAR_COUNT = 32;
const MAX_ERROR_RATE = 10;

type ErrorRateCardProps = Readonly<{
  errorRate: number;
}>;

const GREEN_SHADES = [
  'bg-green-500',
  'bg-green-500/97',
  'bg-green-500/95',
  'bg-green-500/92',
  'bg-green-500/90',
  'bg-green-500/87',
  'bg-green-500/85',
  'bg-green-500/82',
  'bg-green-500/80',
  'bg-green-500/77',
  'bg-green-500/75',
  'bg-green-500/72',
  'bg-green-500/70',
  'bg-green-500/67',
  'bg-green-500/65',
  'bg-green-500/62',
  'bg-green-500/60',
  'bg-green-500/57',
  'bg-green-500/55',
  'bg-green-500/52',
  'bg-green-500/50',
  'bg-green-500/47',
  'bg-green-500/45',
  'bg-green-500/42',
  'bg-green-500/40',
  'bg-green-500/37',
  'bg-green-500/35',
  'bg-green-500/32',
  'bg-green-500/30',
  'bg-green-500/28',
  'bg-green-500/26',
  'bg-green-500/25',
];

const AMBER_SHADES = [
  'bg-amber-500',
  'bg-amber-500/97',
  'bg-amber-500/95',
  'bg-amber-500/92',
  'bg-amber-500/90',
  'bg-amber-500/87',
  'bg-amber-500/85',
  'bg-amber-500/82',
  'bg-amber-500/80',
  'bg-amber-500/77',
  'bg-amber-500/75',
  'bg-amber-500/72',
  'bg-amber-500/70',
  'bg-amber-500/67',
  'bg-amber-500/65',
  'bg-amber-500/62',
  'bg-amber-500/60',
  'bg-amber-500/57',
  'bg-amber-500/55',
  'bg-amber-500/52',
  'bg-amber-500/50',
  'bg-amber-500/47',
  'bg-amber-500/45',
  'bg-amber-500/42',
  'bg-amber-500/40',
  'bg-amber-500/37',
  'bg-amber-500/35',
  'bg-amber-500/32',
  'bg-amber-500/30',
  'bg-amber-500/28',
  'bg-amber-500/26',
  'bg-amber-500/25',
];

const RED_SHADES = [
  'bg-red-500',
  'bg-red-500/97',
  'bg-red-500/95',
  'bg-red-500/92',
  'bg-red-500/90',
  'bg-red-500/87',
  'bg-red-500/85',
  'bg-red-500/82',
  'bg-red-500/80',
  'bg-red-500/77',
  'bg-red-500/75',
  'bg-red-500/72',
  'bg-red-500/70',
  'bg-red-500/67',
  'bg-red-500/65',
  'bg-red-500/62',
  'bg-red-500/60',
  'bg-red-500/57',
  'bg-red-500/55',
  'bg-red-500/52',
  'bg-red-500/50',
  'bg-red-500/47',
  'bg-red-500/45',
  'bg-red-500/42',
  'bg-red-500/40',
  'bg-red-500/37',
  'bg-red-500/35',
  'bg-red-500/32',
  'bg-red-500/30',
  'bg-red-500/28',
  'bg-red-500/26',
  'bg-red-500/25',
];

function getShades(errorRate: number) {
  if (errorRate < 1) return GREEN_SHADES;
  if (errorRate < 5) return AMBER_SHADES;
  return RED_SHADES;
}

const ErrorRateCard = memo(function ErrorRateCard({
  errorRate,
}: ErrorRateCardProps) {
  const shades = getShades(errorRate);
  const filledBars = Math.round(
    (Math.min(errorRate, MAX_ERROR_RATE) / MAX_ERROR_RATE) * BAR_COUNT,
  );

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle>Error Rate</CardTitle>
        <CardDescription>Percentage of Failed Requests</CardDescription>
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
        <div className="text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold text-foreground shrink-0 tabular-nums">
          {errorRate.toFixed(2)}
          <span className="text-[0.4em] font-light ml-1 text-muted-foreground/60">
            %
          </span>
        </div>

        <div className="flex-1 min-w-0 flex justify-end">
          <div className="w-full max-w-[200px] flex gap-0.5">
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const isFilled = i < filledBars;
              return (
                <div
                  className={`h-5 rounded-full flex-1 ${isFilled ? shades[i] : 'bg-muted/30'}`}
                  key={i}
                />
              );
            })}
          </div>
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
            0.00<span className="text-[0.4em] font-light ml-1">%</span>
          </span>
        </Skeleton>
        <div className="flex-1 min-w-0 flex justify-end">
          <div className="w-full max-w-[200px] flex gap-0.5">
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <div className="h-5 rounded-full flex-1 bg-muted/30" key={i} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

ErrorRateCardSkeleton.displayName = 'ErrorRateCardSkeleton';

export { ErrorRateCard, ErrorRateCardSkeleton };
