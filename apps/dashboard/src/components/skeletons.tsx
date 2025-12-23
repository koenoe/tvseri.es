import { Skeleton } from '@/components/ui/skeleton';
import { COLUMN_PADDING, type RatingStatus } from '@/lib/web-vitals';

function TabTriggerValueSkeleton({
  isScoreRing = false,
  width = 'w-14',
}: Readonly<{ isScoreRing?: boolean; width?: string }>) {
  if (isScoreRing) {
    return <Skeleton className="size-9 rounded-full" />;
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <Skeleton className={`h-6 ${width} rounded-none`} />
      <Skeleton className="h-0.75 w-full rounded-full" />
    </div>
  );
}
TabTriggerValueSkeleton.displayName = 'TabTriggerValueSkeleton';

function MetricHeaderSkeleton() {
  return (
    <div className="lg:col-span-2">
      <Skeleton className="mb-2.5 h-4 w-16 rounded-none bg-muted/50" />
      <Skeleton className="mb-4 h-7 w-52 rounded-none" />
      <Skeleton className="my-4 size-16.25 rounded-full" />
      <Skeleton className="mb-2.5 h-5 w-14 rounded-none" />
      <Skeleton className="h-4 w-32 rounded-none bg-muted/50" />
      <Skeleton className="mt-4 h-4 w-9/12 rounded-none bg-muted/50" />
      <hr className="my-5 border-border" />
      <Skeleton className="h-4 w-full rounded-none bg-muted/50" />
      <Skeleton className="mt-1 h-4 w-11/12 rounded-none bg-muted/50" />
      <Skeleton className="mt-1 h-4 w-3/5 rounded-none bg-muted/50" />
      <Skeleton className="mt-4 h-4 w-40 rounded-none bg-muted/50" />
    </div>
  );
}
MetricHeaderSkeleton.displayName = 'MetricHeaderSkeleton';

function ChartSkeleton() {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/50 lg:col-span-3 lg:aspect-auto" />
  );
}
ChartSkeleton.displayName = 'ChartSkeleton';

const ROUTE_WIDTHS: Record<RatingStatus, ReadonlyArray<string>> = {
  great: ['w-24', 'w-40', 'w-44', 'w-36', 'w-36', 'w-28', 'w-32'],
  needsImprovement: ['w-36', 'w-40', 'w-32', 'w-44', 'w-28', 'w-36', 'w-24'],
  poor: ['w-24', 'w-32', 'w-36', 'w-28', 'w-40', 'w-32', 'w-24'],
};

function RouteColumnSkeleton({ variant }: Readonly<{ variant: RatingStatus }>) {
  const widths = ROUTE_WIDTHS[variant];
  return (
    <div className={`flex flex-col ${COLUMN_PADDING[variant]}`}>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-4 w-32 rounded-none bg-muted/50" />
        <Skeleton className="ml-auto h-4 w-10 rounded-none bg-muted/50" />
      </div>
      <div className="space-y-2">
        {widths.map((width, item) => (
          <div className="flex items-center justify-between" key={item}>
            <Skeleton className={`h-7 ${width} rounded-none`} />
            <Skeleton className="h-4 w-6 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
RouteColumnSkeleton.displayName = 'RouteColumnSkeleton';

function RoutesSectionSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-14 rounded-none" />
        <Skeleton className="h-4 w-8 rounded-none bg-muted/50" />
      </div>
      <div className="hidden grid-cols-3 divide-x lg:grid">
        <RouteColumnSkeleton variant="poor" />
        <RouteColumnSkeleton variant="needsImprovement" />
        <RouteColumnSkeleton variant="great" />
      </div>
      <div className="space-y-2 lg:hidden">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
RoutesSectionSkeleton.displayName = 'RoutesSectionSkeleton';

function WorldMapSkeleton() {
  return <Skeleton className="aspect-[1.6/1] w-full rounded-lg bg-muted/30" />;
}
WorldMapSkeleton.displayName = 'WorldMapSkeleton';

function StatusAccordionSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-lg border">
      {[0, 1, 2].map((i) => {
        const isLast = i === 2;
        return (
          <div className={isLast ? 'flex flex-1 flex-col' : ''} key={i}>
            <div
              className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-none" />
              </div>
              <Skeleton className="size-4 rounded-none bg-muted/50" />
            </div>
            {isLast && (
              <div className="flex flex-1 flex-col gap-2 overflow-hidden py-2 pl-5 pr-3">
                {[0, 1, 2, 3, 4].map((j) => (
                  <div
                    className="flex items-center justify-between py-1"
                    key={j}
                  >
                    <Skeleton className="h-4 w-32 rounded-none" />
                    <Skeleton className="h-4 w-12 rounded-none" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
StatusAccordionSkeleton.displayName = 'StatusAccordionSkeleton';

function CountriesSectionSkeleton() {
  return (
    <>
      <div className="grid lg:grid-cols-5">
        <div className="flex items-center justify-between lg:col-span-3">
          <Skeleton className="h-5 w-20 rounded-none" />
          <Skeleton className="h-4 w-8 rounded-none bg-muted/50 lg:hidden" />
        </div>
        <div className="hidden items-center justify-end lg:col-span-2 lg:flex">
          <Skeleton className="mr-5 h-4 w-8 rounded-none bg-muted/50" />
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WorldMapSkeleton />
        </div>
        <div className="lg:col-span-2">
          <StatusAccordionSkeleton />
        </div>
      </div>
    </>
  );
}
CountriesSectionSkeleton.displayName = 'CountriesSectionSkeleton';

function MetricTabContentSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:pt-5 lg:grid lg:grid-cols-5 lg:gap-16">
        <MetricHeaderSkeleton />
        <ChartSkeleton />
      </div>
      <hr className="border-border" />
      <RoutesSectionSkeleton />
      <hr className="border-border" />
      <CountriesSectionSkeleton />
    </div>
  );
}
MetricTabContentSkeleton.displayName = 'MetricTabContentSkeleton';

export { MetricTabContentSkeleton, TabTriggerValueSkeleton, WorldMapSkeleton };
