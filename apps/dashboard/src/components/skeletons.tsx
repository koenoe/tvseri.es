import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for the toggle group (Desktop/Mobile selector) - compact version for header
 */
function ToggleGroupSkeleton() {
  return (
    <div className="ml-auto flex w-fit gap-0.5 rounded-full border border-border p-0.5">
      <Skeleton className="h-6 w-14 rounded-l-full rounded-r-none" />
      <Skeleton className="h-6 w-12 rounded-l-none rounded-r-full" />
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
      className={`flex ${height} shrink-0 flex-col items-stretch justify-center gap-2 border-b border-border px-5 text-left last:border-b-0 max-lg:h-auto max-lg:border-b-0 max-lg:border-r max-lg:px-4 max-lg:py-3 max-lg:last:border-r-0`}
    >
      <Skeleton className="h-6 w-36 rounded-none bg-muted/50 max-lg:w-24" />
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
    <div className="flex h-fit min-w-56 overflow-hidden rounded-xl border border-border max-lg:w-full max-lg:min-w-0 max-lg:flex-row max-lg:overflow-x-auto lg:flex-col">
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
    <div className="lg:col-span-2">
      {/* Device label - muted text */}
      <Skeleton className="mb-2.5 h-4 w-16 rounded-none bg-muted/50" />
      {/* Metric label - white text */}
      <Skeleton className="mb-4 h-7 w-52 rounded-none" />
      {/* Score ring */}
      <Skeleton className="my-4 size-16.25 rounded-full" />
      {/* Status label - white text */}
      <Skeleton className="mb-2.5 h-5 w-14 rounded-none" />
      {/* Threshold - muted text */}
      <Skeleton className="h-4 w-32 rounded-none bg-muted/50" />
      {/* Context message - muted text */}
      <Skeleton className="mt-4 h-4 w-9/12 rounded-none bg-muted/50" />
      {/* Divider */}
      <hr className="my-5 border-border" />
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
    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/50 lg:col-span-3 lg:aspect-auto" />
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
 */
function RoutesSectionSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-14 rounded-none" />
        <Skeleton className="h-4 w-8 rounded-none bg-muted/50" />
      </div>
      {/* Desktop: 3 columns with dividers */}
      <div className="hidden grid-cols-3 divide-x lg:grid">
        <RouteColumnSkeleton variant="poor" />
        <RouteColumnSkeleton variant="needsImprovement" />
        <RouteColumnSkeleton variant="great" />
      </div>
      {/* Mobile: accordion */}
      <div className="space-y-2 lg:hidden">
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
        <Skeleton className="aspect-video rounded-lg bg-muted/30 lg:col-span-3" />
        <div className="space-y-2 lg:col-span-2">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </>
  );
}
CountriesSectionSkeleton.displayName = 'CountriesSectionSkeleton';

/**
 * Skeleton for the entire metric tab content
 */
function MetricTabContentSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:pt-5 lg:grid lg:grid-cols-5 lg:gap-16">
        <MetricHeaderSkeleton />
        <ChartSkeleton />
      </div>
      <hr className="border-border" />

      {/* Routes Section */}
      <RoutesSectionSkeleton />
      <hr className="border-border" />

      {/* Countries Section */}
      <CountriesSectionSkeleton />
    </div>
  );
}
MetricTabContentSkeleton.displayName = 'MetricTabContentSkeleton';

/**
 * Full page skeleton shown during initial load/auth
 * Matches the collapsed sidebar layout with site header
 */
function PageSkeleton() {
  return (
    <div className="flex min-h-svh w-full bg-sidebar">
      {/* Main content area - matches SidebarInset with inset variant + collapsed state */}
      <main className="bg-card text-card-foreground relative flex w-full flex-1 flex-col lg:m-2.5 lg:rounded-xl lg:shadow-sm">
        {/* Site header skeleton */}
        <header className="relative flex h-[calc(var(--spacing)*12+1px)] shrink-0 items-center border-b">
          {/* Sidebar trigger - matches SiteHeader positioning */}
          <div className="flex h-full items-center gap-2 pl-4 2xl:absolute 2xl:left-4 2xl:top-1/2 2xl:-translate-y-1/2 2xl:pl-0">
            <Skeleton className="size-7 rounded-md" />
            <Separator
              className="data-[orientation=vertical]:h-4 self-center!"
              orientation="vertical"
            />
          </div>
          {/* Content - same padding as page content for alignment */}
          <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6">
            <Skeleton className="h-5 w-24 rounded-none" />
            <ToggleGroupSkeleton />
          </div>
        </header>
        {/* Page content skeleton */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6">
          {/* Tabs + Content */}
          <div className="flex w-full flex-col gap-10 lg:flex-row">
            <TabListSkeleton />
            <div className="flex-1">
              <MetricTabContentSkeleton />
            </div>
          </div>
        </div>
      </main>
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
