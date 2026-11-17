import { createFileRoute } from '@tanstack/react-router';

import { ApdexCard, ApdexCardSkeleton } from '@/components/api/apdex-card';
import { EndpointsSection } from '@/components/api/endpoints-table/endpoints-section';
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
import { PAGE_SIZES } from '@/components/api/table/table-pagination';
import { ApiHeader } from '@/components/api-header';
import { useApiMetricsSummary } from '@/lib/api/hooks';
import { formatDependencies } from '@/lib/api-metrics';
import { type DaysValue, DEFAULT_DAYS, parseDays } from '@/lib/search-params';

type ApiSearchParams = {
  days?: DaysValue;
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

    const days = parseDays(search.days);
    if (days) {
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

    const pageSize = PAGE_SIZES.find(
      (size) => size === Number(search.pageSize),
    );
    if (pageSize) {
      result.pageSize = pageSize;
    }

    return result;
  },
});

function ApiMetrics() {
  const days = Route.useSearch({
    select: (s) => s.days ?? DEFAULT_DAYS,
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

      <EndpointsSection days={days} />
    </div>
  );
}
