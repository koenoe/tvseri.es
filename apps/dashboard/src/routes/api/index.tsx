import { createFileRoute } from '@tanstack/react-router';
import { ApdexCard } from '@/components/api/apdex-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiMetricsSummary } from '@/lib/api';

type ApiSearchParams = {
  days?: 7 | 30;
};

export const Route = createFileRoute('/api/')({
  component: ApiMetrics,
  staticData: {
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

  const { data, isLoading, error } = useApiMetricsSummary({
    days,
  });

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error loading metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">
            {(error as Error).message || 'An unknown error occurred'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {isLoading ? (
        <Skeleton className="h-[50] w-full rounded-xl" />
      ) : (
        <ApdexCard score={data?.aggregated?.apdex.score ?? 0} />
      )}
    </div>
  );
}
