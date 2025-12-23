import { createFileRoute, Link } from '@tanstack/react-router';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { memo, useCallback, useMemo, useState } from 'react';

import {
  ErrorRateCard,
  ErrorRateCardSkeleton,
} from '@/components/api/error-rate-card';
import {
  LatencyCard,
  LatencyCardSkeleton,
} from '@/components/api/latency-card';
import {
  OperationsTable,
  OperationsTableSkeleton,
} from '@/components/api/operations-table';
import { PercentileLatencyPopover } from '@/components/api/percentile-latency-popover';
import {
  RequestsCard,
  RequestsCardSkeleton,
} from '@/components/api/requests-card';
import { DateRangeSelect } from '@/components/date-range-select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useApiMetricsDependencyDetail } from '@/lib/api';
import { formatDependencyName } from '@/lib/api-metrics';

type DependencyDetailSearchParams = {
  days?: 3 | 7 | 30;
  source: string;
};

function DependencyDetailHeaderComponent() {
  const { source } = Route.useSearch();
  const displayName = formatDependencyName(source);

  return (
    <div className="flex w-full items-center justify-between">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/api">API</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <DateRangeSelect />
    </div>
  );
}

DependencyDetailHeaderComponent.displayName = 'DependencyDetailHeader';

const DependencyDetailHeader = memo(DependencyDetailHeaderComponent);

export const Route = createFileRoute('/api/dependencies')({
  component: DependencyDetail,
  staticData: {
    headerContent: DependencyDetailHeader,
  },
  validateSearch: (
    search: Record<string, unknown>,
  ): DependencyDetailSearchParams => {
    const days = Number(search.days);
    const source = String(search.source ?? '');
    return {
      days: days === 3 || days === 7 || days === 30 ? days : undefined,
      source,
    };
  },
});

function DependencyDetail() {
  const { days: daysParam, source } = Route.useSearch();
  const days = daysParam ?? 7;

  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: 'requests' },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handlePaginationChange = useCallback(
    (newPagination: PaginationState) => {
      setPagination(newPagination);
    },
    [],
  );

  const { data, isLoading } = useApiMetricsDependencyDetail({
    days,
    source,
  });

  const series = useMemo(
    () =>
      data?.series?.map((s) => ({
        date: s.date,
        errorRate: s.errorRate,
        latency: { p75: s.p75, p90: s.p90, p95: s.p95, p99: s.p99 },
        requestCount: s.count,
      })) ?? [],
    [data?.series],
  );

  const aggregated = data?.aggregated;
  const operations = aggregated?.topOperations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isLoading ? (
          <LatencyCardSkeleton />
        ) : (
          <LatencyCard
            action={<PercentileLatencyPopover series={series} />}
            p75={aggregated?.p75 ?? 0}
            series={series}
          />
        )}
        {isLoading ? (
          <RequestsCardSkeleton />
        ) : (
          <RequestsCard
            action={null}
            requestCount={aggregated?.count ?? 0}
            series={series}
            throughput={aggregated?.throughput ?? 0}
          />
        )}
        {isLoading ? (
          <ErrorRateCardSkeleton />
        ) : (
          <ErrorRateCard
            action={null}
            errorRate={aggregated?.errorRate ?? 0}
            series={series}
          />
        )}
      </div>
      {isLoading ? (
        <OperationsTableSkeleton />
      ) : operations.length > 0 ? (
        <OperationsTable
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          operations={operations}
          pagination={pagination}
          sorting={sorting}
        />
      ) : null}
    </div>
  );
}
