import { createFileRoute } from '@tanstack/react-router';
import { memo } from 'react';
import { ApdexCard, ApdexCardSkeleton } from '@/components/api/apdex-card';
import { ApiDetailHeader } from '@/components/api/api-detail-header';
import { DependenciesSection } from '@/components/api/dependencies-section';
import { MethodBadge, parseEndpoint } from '@/components/api/endpoint-label';
import {
  ErrorRateCard,
  ErrorRateCardSkeleton,
} from '@/components/api/error-rate-card';
import {
  LatencyCard,
  LatencyCardSkeleton,
} from '@/components/api/latency-card';
import { PercentileLatencyPopover } from '@/components/api/percentile-latency-popover';
import {
  RequestsCard,
  RequestsCardSkeleton,
} from '@/components/api/requests-card';
import {
  StatusCodePopover,
  SuccessCodesPopover,
} from '@/components/api/status-code-popover';
import { RouteLabel } from '@/components/route-label';
import { BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useApiMetricsEndpointDetail } from '@/lib/api/hooks';
import { type DaysValue, DEFAULT_DAYS, parseDays } from '@/lib/search-params';

type EndpointDetailSearchParams = {
  days?: DaysValue;
  endpoint: string;
};

function EndpointDetailHeaderComponent() {
  const { endpoint } = Route.useSearch();
  const { method, route } = parseEndpoint(endpoint);

  return (
    <ApiDetailHeader>
      <BreadcrumbPage className="flex items-center gap-2">
        <MethodBadge method={method} />
        <RouteLabel route={route} />
      </BreadcrumbPage>
    </ApiDetailHeader>
  );
}

EndpointDetailHeaderComponent.displayName = 'EndpointDetailHeader';

const EndpointDetailHeader = memo(EndpointDetailHeaderComponent);

export const Route = createFileRoute('/api/endpoints')({
  component: EndpointDetail,
  staticData: {
    headerContent: EndpointDetailHeader,
  },
  validateSearch: (
    search: Record<string, unknown>,
  ): EndpointDetailSearchParams => {
    return {
      days: parseDays(search.days),
      endpoint: String(search.endpoint ?? ''),
    };
  },
});

function EndpointDetail() {
  const { days: daysParam, endpoint } = Route.useSearch();
  const days = daysParam ?? DEFAULT_DAYS;

  const { data, isLoading } = useApiMetricsEndpointDetail({
    days,
    endpoint,
  });

  const series = data?.series ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {isLoading ? (
          <ApdexCardSkeleton />
        ) : (
          <ApdexCard score={data?.aggregated?.apdex.score ?? 0} />
        )}
        {isLoading ? (
          <LatencyCardSkeleton />
        ) : (
          <LatencyCard
            action={<PercentileLatencyPopover series={series} />}
            p75={data?.aggregated?.latency.p75 ?? 0}
            series={series}
          />
        )}
        {isLoading ? (
          <RequestsCardSkeleton />
        ) : (
          <RequestsCard
            action={
              <SuccessCodesPopover
                statusCodes={data?.aggregated?.statusCodes}
              />
            }
            requestCount={data?.aggregated?.requestCount ?? 0}
            series={series}
            throughput={data?.aggregated?.throughput ?? 0}
          />
        )}
        {isLoading ? (
          <ErrorRateCardSkeleton />
        ) : (
          <ErrorRateCard
            action={
              <StatusCodePopover statusCodes={data?.aggregated?.statusCodes} />
            }
            errorRate={data?.aggregated?.errorRate ?? 0}
            series={series}
          />
        )}
      </div>
      {!isLoading && (
        <DependenciesSection dependencies={data?.aggregated?.dependencies} />
      )}
    </div>
  );
}
