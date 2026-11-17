import { lazy, memo, Suspense, useState } from 'react';
import { WorldMapSkeleton } from '@/components/skeletons';
import type { GroupedMetricData, MetricItem } from '@/lib/api/utils';
import type { RatingStatus, StatusConfig } from '@/lib/web-vitals';
import { StatusAccordion } from './status-accordion';

const WorldMap = lazy(() =>
  import('@/components/world-map').then((mod) => ({ default: mod.WorldMap })),
);

const STATUSES: ReadonlyArray<RatingStatus> = [
  'great',
  'needsImprovement',
  'poor',
];

function filterGroups(
  grouped: GroupedMetricData,
  country: string,
): GroupedMetricData {
  const isCountry = (item: MetricItem) => item.id === country;
  return {
    great: grouped.great.filter(isCountry),
    needsImprovement: grouped.needsImprovement.filter(isCountry),
    poor: grouped.poor.filter(isCountry),
  };
}

// The map looks countries up by display name.
function toWorldMapData(grouped: GroupedMetricData) {
  const data: Record<
    string,
    { pageViews: number; status: RatingStatus; value: number | string }
  > = {};
  for (const status of STATUSES) {
    for (const item of grouped[status]) {
      data[item.label] = {
        pageViews: item.pageViews,
        status,
        value: item.value,
      };
    }
  }
  return data;
}

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

  const filteredCountriesGrouped = activeCountry
    ? filterGroups(countriesGrouped, activeCountry)
    : countriesGrouped;
  const worldMapData = toWorldMapData(filteredCountriesGrouped);

  return (
    <>
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
