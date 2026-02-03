import type { ColumnDef } from '@tanstack/react-table';
import type { EndpointMetrics } from '@tvseri.es/schemas';
import { ChevronRight } from 'lucide-react';

import { ScoreRing } from '@/components/ui/score-ring';
import {
  formatCountString,
  formatDependencyName,
  formatErrorRate,
  formatLatency,
  sortDependencyKeys,
} from '@/lib/api-metrics';

import { DependencyBadge } from '../dependency-badge';
import { MethodBadge, parseEndpoint, RouteLabel } from '../endpoint-label';
import { SortIndicator } from './sort-indicator';
import { ErrorRateSparkline, LatencySparkline } from './sparklines';

export const columns: ColumnDef<EndpointMetrics>[] = [
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
      <button
        className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
        onClick={() => column.toggleSorting()}
        type="button"
      >
        Route
        <SortIndicator isSorted={column.getIsSorted()} />
      </button>
    ),
    id: 'endpoint',
    size: 320,
  },
  {
    accessorFn: (row) => row.requestCount,
    cell: ({ row, table }) => {
      const value = row.original.requestCount;
      const maxRequestCount = table.options.meta?.maxRequestCount ?? 1;
      const percentage =
        maxRequestCount > 0 ? (value / maxRequestCount) * 100 : 0;
      return (
        <div
          className="relative flex h-6 max-w-24 items-center rounded-sm bg-muted/80 px-1.5"
          style={{ minWidth: 'fit-content', width: `${percentage}%` }}
        >
          <span className="tabular-nums text-white/80">
            {formatCountString(value)}
          </span>
        </div>
      );
    },
    header: ({ column }) => (
      <button
        className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
        onClick={() => column.toggleSorting()}
        type="button"
      >
        Requests
        <SortIndicator isSorted={column.getIsSorted()} />
      </button>
    ),
    id: 'requests',
    size: 140,
  },
  {
    accessorFn: (row) => row.latency.p75,
    cell: ({ row }) => {
      const p75 = row.original.latency.p75;
      const series = row.original.series;
      return (
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatLatency(p75)}
          </span>
          <LatencySparkline series={series} />
        </div>
      );
    },
    header: ({ column }) => (
      <button
        className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
        onClick={() => column.toggleSorting()}
        type="button"
      >
        Latency
        <SortIndicator isSorted={column.getIsSorted()} />
      </button>
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
      <button
        className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
        onClick={() => column.toggleSorting()}
        type="button"
      >
        Apdex
        <SortIndicator isSorted={column.getIsSorted()} />
      </button>
    ),
    id: 'apdex',
    size: 80,
  },
  {
    accessorFn: (row) => row.errorRate,
    cell: ({ row }) => {
      const errorRate = row.original.errorRate;
      const series = row.original.series;
      return (
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatErrorRate(errorRate)}
          </span>
          <ErrorRateSparkline errorRate={errorRate} series={series} />
        </div>
      );
    },
    header: ({ column }) => (
      <button
        className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
        onClick={() => column.toggleSorting()}
        type="button"
      >
        Error Rate
        <SortIndicator isSorted={column.getIsSorted()} />
      </button>
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

// Extend TanStack Table's meta type
declare module '@tanstack/react-table' {
  interface TableMeta<TData> {
    maxRequestCount?: number;
    totalRequestCount?: number;
  }
}
