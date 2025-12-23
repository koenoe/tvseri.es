import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { SortingState } from '@tanstack/react-table';
import { memo, useCallback } from 'react';

import { ApdexCard, ApdexCardSkeleton } from '@/components/api/apdex-card';
import {
  EndpointsTable,
  EndpointsTableSkeleton,
} from '@/components/api/endpoints-table';
import {
  ErrorRateCard,
  ErrorRateCardSkeleton,
} from '@/components/api/error-rate-card';
import {
  LatencyCard,
  LatencyCardSkeleton,
} from '@/components/api/latency-card';
import {
  RequestsCard,
  RequestsCardSkeleton,
} from '@/components/api/requests-card';
import { ApiHeader } from '@/components/api-header';
import { useApiMetricsEndpoints, useApiMetricsSummary } from '@/lib/api';
import { formatDependencies } from '@/lib/api-metrics';

type ApiSearchParams = {
  days?: 3 | 7 | 30;
  pageIndex?: number;
  pageSize?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
};

export const Route = createFileRoute('/api/')({
  component: ApiMetrics,
  staticData: {
    headerContent: ApiHeader,
    title: 'API',
  },
  validateSearch: (search: Record<string, unknown>): ApiSearchParams => {
    const result: ApiSearchParams = {};

    const days = Number(search.days);
    if (days === 3 || days === 7 || days === 30) {
      result.days = days;
    }

    if (typeof search.sortColumn === 'string' && search.sortColumn) {
      result.sortColumn = search.sortColumn;
    }

    if (search.sortDirection === 'asc' || search.sortDirection === 'desc') {
      result.sortDirection = search.sortDirection;
    }

    const pageIndex = Number(search.pageIndex);
    if (Number.isInteger(pageIndex) && pageIndex >= 0) {
      result.pageIndex = pageIndex;
    }

    const pageSize = Number(search.pageSize);
    if (pageSize === 10 || pageSize === 25 || pageSize === 50) {
      result.pageSize = pageSize;
    }

    return result;
  },
});

const DEFAULT_PAGE_SIZE = 10;

const EndpointsTableWrapper = memo(function EndpointsTableWrapper({
  days,
}: Readonly<{ days: number }>) {
  const navigate = useNavigate();
  const { pageIndex, pageSize, sortColumn, sortDirection } = Route.useSearch({
    select: (s) => ({
      pageIndex: s.pageIndex,
      pageSize: s.pageSize,
      sortColumn: s.sortColumn,
      sortDirection: s.sortDirection,
    }),
  });

  const { data: endpointsData, isLoading } = useApiMetricsEndpoints({ days });

  const sorting: SortingState = sortColumn
    ? [{ desc: sortDirection === 'desc', id: sortColumn }]
    : [{ desc: true, id: 'requests' }];

  const pagination = {
    pageIndex: pageIndex ?? 0,
    pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
  };

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      const firstSort = newSorting[0];
      void navigate({
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          sortColumn: firstSort?.id,
          sortDirection: firstSort?.desc ? 'desc' : 'asc',
        }),
        to: '.',
      });
    },
    [navigate],
  );

  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      void navigate({
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          pageIndex: newPagination.pageIndex || undefined,
          pageSize:
            newPagination.pageSize !== DEFAULT_PAGE_SIZE
              ? newPagination.pageSize
              : undefined,
        }),
        to: '.',
      });
    },
    [navigate],
  );

  if (isLoading) {
    return <EndpointsTableSkeleton />;
  }

  return (
    <EndpointsTable
      endpoints={endpointsData?.endpoints ?? []}
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleSortingChange}
      pagination={pagination}
      sorting={sorting}
    />
  );
});

EndpointsTableWrapper.displayName = 'EndpointsTableWrapper';

function ApiMetrics() {
  const days = Route.useSearch({
    select: (s) => s.days ?? 7,
  });

  const { data: summaryData, isLoading: isSummaryLoading } =
    useApiMetricsSummary({
      days,
    });

  const dependencies = summaryData?.aggregated?.dependencies
    ? formatDependencies(summaryData.aggregated.dependencies)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {isSummaryLoading ? (
          <ApdexCardSkeleton />
        ) : (
          <ApdexCard score={summaryData?.aggregated?.apdex.score ?? 0} />
        )}
        {isSummaryLoading ? (
          <LatencyCardSkeleton />
        ) : (
          <LatencyCard
            dependencies={dependencies}
            p75={summaryData?.aggregated?.latency.p75 ?? 0}
            series={summaryData?.series ?? []}
          />
        )}
        {isSummaryLoading ? (
          <RequestsCardSkeleton />
        ) : (
          <RequestsCard
            dependencies={dependencies}
            requestCount={summaryData?.aggregated?.requestCount ?? 0}
            series={summaryData?.series ?? []}
            throughput={summaryData?.aggregated?.throughput ?? 0}
          />
        )}
        {isSummaryLoading ? (
          <ErrorRateCardSkeleton />
        ) : (
          <ErrorRateCard
            dependencies={dependencies}
            errorRate={summaryData?.aggregated?.errorRate ?? 0}
            series={summaryData?.series ?? []}
          />
        )}
      </div>

      <EndpointsTableWrapper days={days} />
    </div>
  );
}
