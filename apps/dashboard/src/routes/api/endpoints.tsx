import { createFileRoute, Link } from '@tanstack/react-router';
import { memo } from 'react';

import { ApdexCard, ApdexCardSkeleton } from '@/components/api/apdex-card';
import { DependenciesSection } from '@/components/api/dependencies-section';
import {
  MethodBadge,
  parseEndpoint,
  RouteLabel,
} from '@/components/api/endpoint-label';
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
import { DateRangeSelect } from '@/components/date-range-select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useApiMetricsEndpointDetail } from '@/lib/api/hooks';

type EndpointDetailSearchParams = {
  days?: 3 | 7 | 30;
  endpoint: string;
};

function EndpointDetailHeaderComponent() {
  const { endpoint } = Route.useSearch();
  const { method, route } = parseEndpoint(endpoint);

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
            <BreadcrumbPage className="flex items-center gap-2">
              <MethodBadge method={method} />
              <RouteLabel route={route} />
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <DateRangeSelect />
    </div>
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
    const days = Number(search.days);
    const endpoint = String(search.endpoint ?? '');
    return {
      days: days === 3 || days === 7 || days === 30 ? days : undefined,
      endpoint,
    };
  },
});

function EndpointDetail() {
  const { days: daysParam, endpoint } = Route.useSearch();
  const days = daysParam ?? 7;

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
