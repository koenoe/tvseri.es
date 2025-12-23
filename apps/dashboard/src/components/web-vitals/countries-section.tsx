import { lazy, memo, Suspense, useState } from 'react';
import { WorldMapSkeleton } from '@/components/skeletons';
import type { GroupedMetricData } from '@/lib/api/utils';
import type { RatingStatus, StatusConfig } from '@/lib/web-vitals';
import { StatusAccordion } from './status-accordion';

const WorldMap = lazy(() =>
  import('@/components/world-map').then((mod) => ({ default: mod.WorldMap })),
);

type CountriesSectionProps = Readonly<{
  countriesGrouped: GroupedMetricData;
  currentStatus: RatingStatus;
  metricLabel: string;
  metricName: string;
  onViewAll: (status: RatingStatus) => void;
  statusConfig: Readonly<Record<RatingStatus, StatusConfig>>;
  uniqueKey: string;
}>;

function CountriesSectionComponent({
  countriesGrouped,
  currentStatus,
  metricLabel,
  metricName,
  onViewAll,
  statusConfig,
  uniqueKey,
}: CountriesSectionProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Convert grouped data to WorldMap format
  const worldMapData: Record<
    string,
    { pageViews: number; status: RatingStatus; value: number | string }
  > = {};

  const statuses: ReadonlyArray<RatingStatus> = [
    'great',
    'needsImprovement',
    'poor',
  ];

  for (const status of statuses) {
    for (const item of countriesGrouped[status]) {
      worldMapData[item.label] = {
        pageViews: item.pageViews,
        status,
        value: item.value,
      };
    }
  }

  return (
    <>
      {/* Countries Header */}
      <div className="grid lg:grid-cols-5">
        <div className="flex items-center justify-between lg:col-span-3">
          <h3 className="font-semibold">Countries</h3>
          <span className="text-sm text-muted-foreground lg:hidden">
            {metricName}
          </span>
        </div>
        <div className="hidden items-center justify-end lg:col-span-2 lg:flex">
          <span className="mr-3 text-sm text-muted-foreground">
            {metricName}
          </span>
        </div>
      </div>

      {/* Countries Content */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:items-start">
        <div className="flex items-center justify-center lg:col-span-3">
          <Suspense fallback={<WorldMapSkeleton />}>
            <WorldMap
              className="w-full"
              data={worldMapData}
              hoveredCountry={hoveredCountry}
              metricLabel={metricLabel}
              onCountryHover={setHoveredCountry}
            />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <StatusAccordion
            data={countriesGrouped}
            defaultStatus={currentStatus}
            highlightedItem={hoveredCountry}
            key={uniqueKey}
            onItemHover={setHoveredCountry}
            onViewAll={onViewAll}
            statusConfig={statusConfig}
            variant="country"
          />
        </div>
      </div>
    </>
  );
}

CountriesSectionComponent.displayName = 'CountriesSection';
export const CountriesSection = memo(CountriesSectionComponent);
