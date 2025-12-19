import { createFileRoute } from '@tanstack/react-router';
import { ApdexCard, ApdexCardSkeleton } from '@/components/api/apdex-card';
import {
  ErrorRateCard,
  ErrorRateCardSkeleton,
} from '@/components/api/error-rate-card';
import {
  LatencyCard,
  LatencyCardSkeleton,
} from '@/components/api/latency-card';
import { ApiHeader } from '@/components/api-header';
import { useApiMetricsSummary } from '@/lib/api';

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

  const { data, isLoading } = useApiMetricsSummary({
    days,
  });

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {isLoading ? (
        <ApdexCardSkeleton />
      ) : (
        <ApdexCard score={data?.aggregated?.apdex.score ?? 0} />
      )}
      {isLoading ? (
        <LatencyCardSkeleton />
      ) : (
        <LatencyCard
          p75={data?.aggregated?.latency.p75 ?? 0}
          series={data?.series ?? []}
        />
      )}
      {isLoading ? (
        <ErrorRateCardSkeleton />
      ) : (
        <ErrorRateCard errorRate={data?.aggregated?.errorRate ?? 0} />
      )}
    </div>
  );
}
