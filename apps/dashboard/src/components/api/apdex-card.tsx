import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  MoreVertical,
} from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { getApdexStatusConfig } from '@/lib/api-metrics';
import { cn } from '@/lib/utils';

type ApdexCardProps = Readonly<{
  score: number;
}>;

const ROWS = 4;
const COLS = 8;
const TOTAL_CELLS = ROWS * COLS;

const PALETTES = {
  amber: [
    'bg-amber-500',
    'bg-amber-500/75',
    'bg-amber-500/50',
    'bg-amber-500/25',
  ],
  green: [
    'bg-green-500',
    'bg-green-500/75',
    'bg-green-500/50',
    'bg-green-500/25',
  ],
  red: ['bg-red-500', 'bg-red-500/75', 'bg-red-500/50', 'bg-red-500/25'],
};

function getPalette(score: number) {
  if (score >= 0.85) return PALETTES.green;
  if (score >= 0.7) return PALETTES.amber;
  return PALETTES.red;
}

const STATUS_ICONS = {
  frustrated: CircleAlert,
  satisfied: CircleCheck,
  tolerating: CircleMinus,
} as const;

const READABLE_THRESHOLDS = {
  frustrated: 'Below 0.50',
  satisfied: 'Above 0.85',
  tolerating: 'Between 0.50 and 0.85',
} as const;

const ApdexCard = memo(function ApdexCard({ score }: ApdexCardProps) {
  const palette = getPalette(score);
  const filledCells = Math.round(score * TOTAL_CELLS);
  const statusConfig = getApdexStatusConfig(score);
  const StatusIcon = STATUS_ICONS[statusConfig.status];
  const readableThreshold = READABLE_THRESHOLDS[statusConfig.status];

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle>Apdex Score</CardTitle>
        <CardDescription>Application Performance Index</CardDescription>
        <CardAction>
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
            <PopoverContent align="end" className="w-80 p-4">
              <div className="space-y-4">
                <p className="font-semibold">{statusConfig.label}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <StatusIcon className={cn('size-4', statusConfig.text)} />
                  {readableThreshold}
                </p>
                <hr className="border-border" />
                <p className="text-sm text-muted-foreground">
                  Apdex (Application Performance Index) measures user
                  satisfaction based on response times. Scores range from 0 to
                  1, where 1 represents all users satisfied.
                </p>
                <a
                  className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 text-sm"
                  href="https://en.wikipedia.org/wiki/Apdex"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Learn more about Apdex
                  <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </PopoverContent>
          </Popover>
        </CardAction>
      </CardHeader>
      <CardContent className="@container flex items-center justify-between gap-6 lg:gap-10">
        <div className="text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold text-foreground shrink-0">
          {score.toFixed(2)}
        </div>
        <div className="flex-1 h-14 min-w-0 flex justify-end">
          <div className="grid grid-cols-8 gap-1 w-full max-w-60 content-center">
            {Array.from({ length: TOTAL_CELLS }).map((_, index) => {
              const row = Math.floor(index / COLS);
              const isFilled = index < filledCells;
              const colorClass = isFilled ? palette[row] : 'bg-muted';

              return (
                <div
                  className={cn('aspect-4/1 w-full rounded-full', colorClass)}
                  key={index}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ApdexCard.displayName = 'ApdexCard';

function ApdexCardSkeleton() {
  return (
    <Card className="w-full border">
      <CardHeader>
        <Skeleton className="h-4 w-24 rounded-none bg-white/40" />
        <Skeleton className="h-3.5 w-44 rounded-none" />
        <CardAction>
          <Button
            className="text-muted-foreground"
            disabled
            size="icon-sm"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="@container flex items-center justify-between gap-6 lg:gap-10">
        <Skeleton className="text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold shrink-0 rounded-none bg-white/40">
          <span className="invisible">0.00</span>
        </Skeleton>
        <div className="flex-1 h-14 min-w-0 flex justify-end">
          <div className="grid grid-cols-8 gap-1 w-full max-w-60 content-center">
            {Array.from({ length: TOTAL_CELLS }).map((_, index) => (
              <div
                className={cn('aspect-4/1 w-full rounded-full', 'bg-muted')}
                key={index}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
ApdexCardSkeleton.displayName = 'ApdexCardSkeleton';

export { ApdexCard, ApdexCardSkeleton };
