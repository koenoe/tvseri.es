import { lazy, memo, Suspense, useState } from 'react';
import { WorldMapSkeleton } from '@/components/skeletons';
import type { GroupedMetricData } from '@/lib/api/utils';
import type { RatingStatus, StatusConfig } from '@/lib/web-vitals';
import { StatusAccordion } from './status-accordion';

const WorldMap = lazy(() =>
  import('@/components/world-map').then((mod) => ({ default: mod.WorldMap })),
);

type CountriesSectionProps = Readonly<{
  activeCountry?: string;
  countriesGrouped: GroupedMetricData;
  currentStatus: RatingStatus;
  metricLabel: string;
  metricName: string;
  onCountrySelect: (country: string) => void;
  onViewAll: (status: RatingStatus) => void;
  statusConfig: Readonly<Record<RatingStatus, StatusConfig>>;
  uniqueKey: string;
}>;

function CountriesSectionComponent({
  activeCountry,
  countriesGrouped,
  currentStatus,
  metricLabel,
  metricName,
  onCountrySelect,
  onViewAll,
  statusConfig,
  uniqueKey,
}: CountriesSectionProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Filter countries if there's an active filter
  const filteredCountriesGrouped: GroupedMetricData = activeCountry
    ? {
        great: countriesGrouped.great.filter(
          (item) => item.id === activeCountry,
        ),
        needsImprovement: countriesGrouped.needsImprovement.filter(
          (item) => item.id === activeCountry,
        ),
        poor: countriesGrouped.poor.filter((item) => item.id === activeCountry),
      }
    : countriesGrouped;

  // Convert grouped data to WorldMap format (use filtered data when filter is active)
  const worldMapData: Record<
    string,
    { pageViews: number; status: RatingStatus; value: number | string }
  > = {};

  const statuses: ReadonlyArray<RatingStatus> = [
    'great',
    'needsImprovement',
    'poor',
  ];

  const dataForMap = activeCountry
    ? filteredCountriesGrouped
    : countriesGrouped;
  for (const status of statuses) {
    for (const item of dataForMap[status]) {
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
            data={filteredCountriesGrouped}
            defaultStatus={currentStatus}
            hasActiveFilter={Boolean(activeCountry)}
            highlightedItem={hoveredCountry}
            key={uniqueKey}
            onItemClick={activeCountry ? undefined : onCountrySelect}
            onItemHover={setHoveredCountry}
            onViewAll={activeCountry ? undefined : onViewAll}
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
