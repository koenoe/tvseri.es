import { MoreVertical } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
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

const ApdexCard = memo(function ApdexCard({ score }: ApdexCardProps) {
  const palette = getPalette(score);
  const filledCells = Math.round(score * TOTAL_CELLS);

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle>Apdex Score</CardTitle>
        <CardDescription>Application Performance Index</CardDescription>
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
          {score.toFixed(2)}
        </div>
        <div className="grid flex-1 grid-cols-8 gap-1 min-w-0">
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
          <span className="invisible">0.00</span>
        </Skeleton>
        <div className="grid flex-1 grid-cols-8 gap-1 min-w-0">
          {Array.from({ length: TOTAL_CELLS }).map((_, index) => (
            <div
              className={cn('aspect-4/1 w-full rounded-full', 'bg-muted')}
              key={index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
ApdexCardSkeleton.displayName = 'ApdexCardSkeleton';

export { ApdexCard, ApdexCardSkeleton };
