import type { ApiMetricsDependencyDetailResponse } from '@/lib/api/client';
import {
  formatErrorRate,
  formatLatency,
  getErrorRateColor,
  getLatencyColor,
  toStatusCodes,
} from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';

import { RouteLabel } from '../endpoint-label';
import { StatusCodePopover } from '../status-code-popover';
import { RequestBar } from '../table/request-bar';
import { SortableHeader } from '../table/sortable-header';
import type { ApiColumnDef } from '../table/table-features';
import {
  ErrorRateSparkline,
  LatencySparkline,
} from '../table/table-sparklines';

export type OperationStats = NonNullable<
  NonNullable<ApiMetricsDependencyDetailResponse['aggregated']>['topOperations']
>[number];

export const columns: ApiColumnDef<OperationStats>[] = [
  {
    accessorFn: (row) => row.operation,
    cell: ({ row }) => {
      const operation = row.original.operation;
      const isPath = operation.startsWith('/');

      return isPath ? (
        <RouteLabel route={operation} />
      ) : (
        <span className="font-medium">{operation}</span>
      );
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Operation</SortableHeader>
    ),
    id: 'operation',
    size: 300,
  },
  {
    accessorFn: (row) => row.count,
    cell: ({ row, table }) => {
      const value = row.original.count;
      const maxRequestCount = table.options.meta?.maxRequestCount ?? 1;
      return (
        <RequestBar maxRequestCount={maxRequestCount} requestCount={value} />
      );
    },
    header: ({ column }) => (
      <SortableHeader column={column}>Requests</SortableHeader>
    ),
    id: 'requests',
    size: 140,
  },
  {
    accessorFn: (row) => row.p75,
    cell: ({ row }) => {
      const p75 = row.original.p75;
      const series = row.original.series;
      const values =
        series && series.length > 1
          ? series.map((point) => point.p75)
          : undefined;
      const color = STATUS_COLORS[getLatencyColor(p75)].hsl;
      return (
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatLatency(p75)}
          </span>
          <LatencySparkline color={color} values={values} />
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
    accessorFn: (row) => row.errorRate,
    cell: ({ row }) => {
      const errorRate = row.original.errorRate;
      const values = row.original.series?.map((point) => point.errorRate);
      const color = STATUS_COLORS[getErrorRateColor(errorRate)].hsl;
      return (
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatErrorRate(errorRate)}
          </span>
          <ErrorRateSparkline
            color={color}
            errorRate={errorRate}
            values={values}
          />
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
    cell: ({ row }) => {
      const statusCodes = toStatusCodes(row.original.codes);

      return (
        <div className="flex justify-end">
          <StatusCodePopover statusCodes={statusCodes} />
        </div>
      );
    },
    enableSorting: false,
    header: () => null,
    id: 'actions',
    size: 48,
  },
];
