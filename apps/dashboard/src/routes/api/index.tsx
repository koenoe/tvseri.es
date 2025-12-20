import { createFileRoute } from '@tanstack/react-router';
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
import { ApiHeader } from '@/components/api-header';
import { useApiMetricsEndpoints, useApiMetricsSummary } from '@/lib/api';

type ApiSearchParams = {
  days?: 7 | 30;
};

export const Route = createFileRoute('/api/')({
  component: ApiMetrics,
  staticData: {
    headerContent: ApiHeader,
    title: 'API',
  },
  validateSearch: (search: Record<string, unknown>): ApiSearchParams => {
    const days = Number(search.days);
    if (days === 7 || days === 30) {
      return { days };
    }
    return {};
  },
});

function ApiMetrics() {
  const { days: daysParam } = Route.useSearch();
  const days = daysParam ?? 7;

  const { data: summaryData, isLoading: isSummaryLoading } =
    useApiMetricsSummary({
      days,
    });

  const { data: endpointsData, isLoading: isEndpointsLoading } =
    useApiMetricsEndpoints({
      days,
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {isSummaryLoading ? (
          <ApdexCardSkeleton />
        ) : (
          <ApdexCard score={summaryData?.aggregated?.apdex.score ?? 0} />
        )}
        {isSummaryLoading ? (
          <LatencyCardSkeleton />
        ) : (
          <LatencyCard
            p75={summaryData?.aggregated?.latency.p75 ?? 0}
            series={summaryData?.series ?? []}
          />
        )}
        {isSummaryLoading ? (
          <ErrorRateCardSkeleton />
        ) : (
          <ErrorRateCard errorRate={summaryData?.aggregated?.errorRate ?? 0} />
        )}
      </div>

      {isEndpointsLoading ? (
        <EndpointsTableSkeleton />
      ) : (
        <EndpointsTable endpoints={endpointsData?.endpoints ?? []} />
      )}
    </div>
  );
}
