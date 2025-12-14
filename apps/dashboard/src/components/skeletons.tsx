import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for the toggle group (Desktop/Mobile selector)
 */
function ToggleGroupSkeleton() {
  return (
    <div className="mr-5 flex w-fit gap-1 rounded-full border border-border p-1">
      <Skeleton className="h-7 w-16 rounded-full max-md:h-8" />
      <Skeleton className="h-7 w-14 rounded-full max-md:h-8" />
    </div>
  );
}
ToggleGroupSkeleton.displayName = 'ToggleGroupSkeleton';

/** Tab trigger value widths for skeleton variation */
const TAB_VALUE_WIDTHS = ['w-14', 'w-16', 'w-20', 'w-6', 'w-14'];

/**
 * Skeleton for tab trigger value (score ring or metric value)
 */
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

/**
 * Skeleton for a single tab trigger
 * Actual dimensions: first ~102px, others ~92px
 */
function TabTriggerSkeleton({ index }: Readonly<{ index: number }>) {
  const isFirst = index === 0;
  const valueWidth = TAB_VALUE_WIDTHS[index - 1] ?? 'w-14';
  const height = isFirst ? 'h-[105px]' : 'h-[95px]';

  return (
    <div
      className={`flex ${height} shrink-0 flex-col items-stretch justify-center gap-2 border-b border-border px-5 text-left last:border-b-0 max-md:h-auto max-md:border-b-0 max-md:border-r max-md:px-4 max-md:py-3 max-md:last:border-r-0`}
    >
      <Skeleton className="h-6 w-36 rounded-none bg-muted/50 max-md:w-24" />
      <TabTriggerValueSkeleton isScoreRing={isFirst} width={valueWidth} />
    </div>
  );
}
TabTriggerSkeleton.displayName = 'TabTriggerSkeleton';

/**
 * Skeleton for the tab list (all 6 tabs)
 */
function TabListSkeleton() {
  return (
    <div className="flex h-fit min-w-56 overflow-hidden rounded-xl border border-border max-md:w-full max-md:min-w-0 max-md:flex-row max-md:overflow-x-auto md:flex-col">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <TabTriggerSkeleton index={i} key={i} />
      ))}
    </div>
  );
}
TabListSkeleton.displayName = 'TabListSkeleton';

/**
 * Skeleton for the metric header section (left side of content area)
 */
function MetricHeaderSkeleton() {
  return (
    <div className="md:col-span-2">
      {/* Device label - muted text */}
      <Skeleton className="mb-2.5 h-4 w-16 rounded-none bg-muted/50" />
      {/* Metric label - white text */}
      <Skeleton className="mb-4 h-7 w-52 rounded-none" />
      {/* Score ring */}
      <Skeleton className="my-4 size-16.25 rounded-full" />
      {/* Status label - white text */}
      <Skeleton className="mb-2 h-5 w-14 rounded-none" />
      {/* Threshold - muted text */}
      <Skeleton className="h-4 w-8 rounded-none bg-muted/50" />
      {/* Context message - muted text */}
      <Skeleton className="mt-4 h-4 w-9/12 rounded-none bg-muted/50" />
      {/* Divider */}
      <div className="my-4 h-px w-full bg-border" />
      {/* Description - muted text - 3 lines */}
      <Skeleton className="h-4 w-full rounded-none bg-muted/50" />
      <Skeleton className="mt-1 h-4 w-11/12 rounded-none bg-muted/50" />
      <Skeleton className="mt-1 h-4 w-3/5 rounded-none bg-muted/50" />
      {/* Learn more link */}
      <Skeleton className="mt-4 h-4 w-40 rounded-none bg-muted/50" />
    </div>
  );
}
MetricHeaderSkeleton.displayName = 'MetricHeaderSkeleton';

/**
 * Skeleton for the chart placeholder - matches actual chart placeholder dimensions
 */
function ChartSkeleton() {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/50 md:col-span-3 md:aspect-auto" />
  );
}
ChartSkeleton.displayName = 'ChartSkeleton';

/** Route item widths for skeleton variation - 7 items per column */
const ROUTE_WIDTHS = {
  great: ['w-24', 'w-40', 'w-44', 'w-36', 'w-36', 'w-28', 'w-32'],
  needsImprovement: ['w-36', 'w-40', 'w-32', 'w-44', 'w-28', 'w-36', 'w-24'],
  poor: ['w-24', 'w-32', 'w-36', 'w-28', 'w-40', 'w-32', 'w-24'],
};

/** Column padding to match StatusColumns */
const COLUMN_PADDING: Record<'poor' | 'needsImprovement' | 'great', string> = {
  great: 'pl-6',
  needsImprovement: 'px-6',
  poor: 'pr-6',
};

/**
 * Skeleton for a single route column (Poor/Needs Improvement/Great)
 */
function RouteColumnSkeleton({
  variant,
}: Readonly<{ variant: 'poor' | 'needsImprovement' | 'great' }>) {
  const widths = ROUTE_WIDTHS[variant];
  return (
    <div className={`flex flex-col ${COLUMN_PADDING[variant]}`}>
      {/* Column header */}
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-4 w-32 rounded-none bg-muted/50" />
        <Skeleton className="ml-auto h-4 w-10 rounded-none bg-muted/50" />
      </div>
      {/* Route items */}
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

/**
 * Skeleton for the routes section
 * Actual height: ~290px
 */
function RoutesSectionSkeleton() {
  return (
    <div className="px-0 py-6 md:p-6 md:pb-10">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-14 rounded-none" />
        <Skeleton className="h-4 w-8 rounded-none bg-muted/50" />
      </div>
      {/* Desktop: 3 columns with dividers */}
      <div className="hidden grid-cols-3 divide-x md:grid">
        <RouteColumnSkeleton variant="poor" />
        <RouteColumnSkeleton variant="needsImprovement" />
        <RouteColumnSkeleton variant="great" />
      </div>
      {/* Mobile: accordion */}
      <div className="space-y-2 md:hidden">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
RoutesSectionSkeleton.displayName = 'RoutesSectionSkeleton';

/**
 * Skeleton for the countries section
 */
function CountriesSectionSkeleton() {
  return (
    <div className="px-0 py-6 md:py-6 md:pl-6 md:pr-1">
      <div className="mb-4 grid md:grid-cols-5">
        <div className="flex items-center justify-between md:col-span-3">
          <Skeleton className="h-5 w-20 rounded-none" />
          <Skeleton className="h-4 w-8 rounded-none bg-muted/50 md:hidden" />
        </div>
        <div className="hidden md:col-span-2 md:flex md:justify-end">
          <Skeleton className="mr-5 h-4 w-8 rounded-none bg-muted/50" />
        </div>
      </div>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-5">
        <Skeleton className="aspect-video rounded-lg md:col-span-3" />
        <div className="space-y-2 md:col-span-2">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
CountriesSectionSkeleton.displayName = 'CountriesSectionSkeleton';

/**
 * Skeleton for the entire metric tab content
 */
function MetricTabContentSkeleton() {
  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-6 px-0 py-6 md:grid md:grid-cols-5 md:gap-16 md:p-6">
        <MetricHeaderSkeleton />
        <ChartSkeleton />
      </div>
      <hr className="border-border md:mx-6" />

      {/* Routes Section */}
      <RoutesSectionSkeleton />
      <hr className="border-border md:mx-6" />

      {/* Countries Section */}
      <CountriesSectionSkeleton />
    </>
  );
}
MetricTabContentSkeleton.displayName = 'MetricTabContentSkeleton';

/**
 * Full page skeleton shown during initial load/auth
 */
function PageSkeleton() {
  return (
    <div className="flex min-h-screen justify-center p-8">
      <div className="flex w-full max-w-7xl flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-28 rounded-none" />
            <Skeleton className="h-4 w-32 rounded-none bg-muted/50" />
          </div>
          <ToggleGroupSkeleton />
        </div>

        {/* Tabs + Content */}
        <div className="flex w-full flex-col gap-2 max-md:flex-col md:flex-row">
          <TabListSkeleton />
          <div className="flex-1">
            <MetricTabContentSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
PageSkeleton.displayName = 'PageSkeleton';

export {
  ChartSkeleton,
  CountriesSectionSkeleton,
  MetricHeaderSkeleton,
  MetricTabContentSkeleton,
  PageSkeleton,
  RouteColumnSkeleton,
  RoutesSectionSkeleton,
  TabListSkeleton,
  TabTriggerSkeleton,
  TabTriggerValueSkeleton,
  ToggleGroupSkeleton,
};
