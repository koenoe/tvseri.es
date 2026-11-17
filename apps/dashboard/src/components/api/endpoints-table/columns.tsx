import type { EndpointMetrics } from '@tvseri.es/schemas';
import { ChevronRight } from 'lucide-react';

import { ScoreRing } from '@/components/ui/score-ring';
import {
  formatDependencyName,
  formatErrorRate,
  formatLatency,
  sortDependencyKeys,
} from '@/lib/api-metrics';

import { DependencyBadge } from '../dependency-badge';
import { MethodBadge, parseEndpoint, RouteLabel } from '../endpoint-label';
import { RequestBar } from '../table/request-bar';
import { SortableHeader } from '../table/sortable-header';
import type { ApiColumnDef } from '../table/table-features';
import {
  ErrorRateSparkline,
  LatencySparkline,
} from '../table/table-sparklines';

export const columns: ApiColumnDef<EndpointMetrics>[] = [
  {
    accessorFn: (row) => row.endpoint,
    cell: ({ row }) => {
      const { method, route } = parseEndpoint(row.original.endpoint);

      return (
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <MethodBadge method={method} />
          <RouteLabel route={route} />
        </div>
      );
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Route</SortableHeader>
    ),
    id: 'endpoint',
    size: 320,
  },
  {
    accessorFn: (row) => row.requestCount,
    cell: ({ row, table }) => {
      const maxRequestCount = table.options.meta?.maxRequestCount ?? 1;
      return (
        <RequestBar
          maxRequestCount={maxRequestCount}
          requestCount={row.original.requestCount}
        />
      );
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Requests</SortableHeader>
    ),
    id: 'requests',
    size: 140,
  },
  {
    accessorFn: (row) => row.latency.p75,
    cell: ({ row }) => {
      const p75 = row.original.latency.p75;
      const values = row.original.series?.map((point) => point.p75);
      return (
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatLatency(p75)}
          </span>
          <LatencySparkline values={values} />
        </div>
      );
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Latency</SortableHeader>
    ),
    id: 'latency',
    size: 140,
  },
  {
    accessorFn: (row) => row.apdex.score,
    cell: ({ getValue }) => {
      const score = getValue() as number;
      return (
        <ScoreRing label={score.toFixed(2)} score={score * 100} size={32} />
      );
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Apdex</SortableHeader>
    ),
    id: 'apdex',
    size: 80,
  },
  {
    accessorFn: (row) => row.errorRate,
    cell: ({ row }) => {
      const errorRate = row.original.errorRate;
      const values = row.original.series?.map((point) => point.errorRate ?? 0);
      return (
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatErrorRate(errorRate)}
          </span>
          <ErrorRateSparkline errorRate={errorRate} values={values} />
        </div>
      );
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Error Rate</SortableHeader>
    ),
    id: 'errorRate',
    size: 140,
  },
  {
    accessorFn: (row) => row.dependencies,
    cell: ({ row }) => {
      const dependencies = sortDependencyKeys(
        Object.keys(row.original.dependencies ?? {}),
      );
      if (dependencies.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {dependencies.map((dep) => (
            <DependencyBadge
              key={dep}
              linkable
              name={formatDependencyName(dep)}
              source={dep}
            />
          ))}
        </div>
      );
    },
    enableSorting: false,
    header: () => <span className="text-muted-foreground">Dependencies</span>,
    id: 'dependencies',
    size: 120,
  },
  {
    cell: () => (
      <div className="flex justify-end">
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    ),
    enableSorting: false,
    header: () => null,
    id: 'chevron',
    maxSize: 32,
    size: 32,
  },
];
