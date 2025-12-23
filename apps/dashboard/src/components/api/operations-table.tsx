import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatErrorRate,
  formatLatency,
  getLatencyStatus,
} from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';
import { RouteLabel } from './endpoint-label';
import { RequestBar } from './request-bar';
import { StatusCodePopover } from './status-code-popover';

export type OperationStats = Readonly<{
  codes?: Record<string, number>;
  count: number;
  errorCount: number;
  errorRate: number;
  operation: string;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  series?: ReadonlyArray<{
    date: string;
    errorRate: number;
    p75: number;
  }>;
}>;

type OperationsTableProps = Readonly<{
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange: (sorting: SortingState) => void;
  operations: ReadonlyArray<OperationStats>;
  pagination: PaginationState;
  sorting: SortingState;
}>;

const SPARKLINE_WIDTH = 48;
const SPARKLINE_HEIGHT = 16;

function getSmoothSparklinePath(
  points: ReadonlyArray<number>,
  width: number,
  height: number,
) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M 0,${height / 2} L ${width},${height / 2}`;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const normalizedVal = (val - min) / range;
    const y = height - (normalizedVal * (height * 0.8) + height * 0.1);
    return [x, y] as const;
  });

  const firstPoint = coords[0];
  if (!firstPoint) return '';

  let d = `M ${firstPoint[0].toFixed(1)},${firstPoint[1].toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(i - 1, 0)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(i + 2, coords.length - 1)];

    if (!p0 || !p1 || !p2 || !p3) continue;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;

    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  return d;
}

function getSharpSparklinePath(
  points: ReadonlyArray<number>,
  width: number,
  height: number,
) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M 0,${height / 2} L ${width},${height / 2}`;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const normalizedVal = (val - min) / range;
    const y = height - (normalizedVal * (height * 0.8) + height * 0.1);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${coords.join(' L ')}`;
}

function getLatencyColor(p75: number): string {
  const status = getLatencyStatus(p75);
  if (status === 'fast') return STATUS_COLORS.green.hsl;
  if (status === 'moderate') return STATUS_COLORS.amber.hsl;
  return STATUS_COLORS.red.hsl;
}

function getErrorRateColor(errorRate: number): string {
  if (errorRate < 1) return STATUS_COLORS.green.hsl;
  if (errorRate < 5) return STATUS_COLORS.amber.hsl;
  return STATUS_COLORS.red.hsl;
}

function LatencySparkline({
  p75,
  series,
}: Readonly<{
  p75: number;
  series: ReadonlyArray<{ p75: number }> | undefined;
}>) {
  const path = useMemo(() => {
    if (!series || series.length <= 1) return '';
    return getSmoothSparklinePath(
      series.map((s) => s.p75),
      SPARKLINE_WIDTH,
      SPARKLINE_HEIGHT,
    );
  }, [series]);

  const color = getLatencyColor(p75);

  if (!path) return <div className="h-4 w-12" />;

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ErrorRateSparkline({
  errorRate,
  series,
}: Readonly<{
  errorRate: number;
  series: ReadonlyArray<{ errorRate: number }> | undefined;
}>) {
  const path = useMemo(() => {
    if (!series || series.length <= 1) return '';
    const errorRates = series.map((s) => s.errorRate);
    const hasVariation = errorRates.some((r) => r !== errorRates[0]);
    if (!hasVariation) return '';
    return getSharpSparklinePath(errorRates, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);
  }, [series]);

  const color = getErrorRateColor(errorRate);

  if (!path) {
    const normalizedRate = Math.min(errorRate, 10) / 10;
    const y =
      SPARKLINE_HEIGHT -
      normalizedRate * SPARKLINE_HEIGHT * 0.8 -
      SPARKLINE_HEIGHT * 0.1;

    return (
      <svg
        aria-hidden="true"
        className="h-4 w-12"
        preserveAspectRatio="none"
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      >
        <line
          stroke={color}
          strokeLinecap="round"
          strokeWidth="1.5"
          x1="0"
          x2={SPARKLINE_WIDTH}
          y1={y}
          y2={y}
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SortIndicator({
  isSorted,
}: Readonly<{ isSorted: 'asc' | 'desc' | false }>) {
  if (isSorted === 'asc') {
    return <ChevronUp className="ml-1 size-3" />;
  }
  if (isSorted === 'desc') {
    return <ChevronDown className="ml-1 size-3" />;
  }
  return (
    <ChevronsUpDown className="ml-1 size-3 opacity-0 group-hover/sort:opacity-100" />
  );
}

const columns: ColumnDef<OperationStats>[] = [
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
      <button
        className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
        onClick={() => column.toggleSorting()}
        type="button"
      >
        Operation
        <SortIndicator isSorted={column.getIsSorted()} />
      </button>
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
    accessorFn: (row) => row.p75,
    cell: ({ row }) => {
      const p75 = row.original.p75;
      const series = row.original.series;
      return (
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatLatency(p75)}
          </span>
          <LatencySparkline p75={p75} series={series} />
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
    cell: ({ row }) => {
      const codes = row.original.codes ?? {};
      const statusCodes = {
        clientError: 0,
        codes,
        redirect: 0,
        serverError: 0,
        success: 0,
      };

      for (const [code, count] of Object.entries(codes)) {
        const status = Number.parseInt(code, 10);
        if (status >= 200 && status < 300) statusCodes.success += count;
        else if (status >= 300 && status < 400) statusCodes.redirect += count;
        else if (status >= 400 && status < 500)
          statusCodes.clientError += count;
        else if (status >= 500) statusCodes.serverError += count;
      }

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

declare module '@tanstack/react-table' {
  // biome-ignore lint/correctness/noUnusedVariables: Required for module augmentation
  interface TableMeta<TData> {
    maxRequestCount?: number;
  }
}

const OperationsTable = memo(function OperationsTable({
  onPaginationChange,
  onSortingChange,
  operations,
  pagination,
  sorting,
}: OperationsTableProps) {
  const maxRequestCount = useMemo(
    () => Math.max(...operations.map((op) => op.count), 1),
    [operations],
  );

  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(sorting)
          : updaterOrValue;
      onSortingChange(newSorting);
    },
    [onSortingChange, sorting],
  );

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updaterOrValue) => {
      const newPagination =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(pagination)
          : updaterOrValue;
      onPaginationChange(newPagination);
    },
    [onPaginationChange, pagination],
  );

  const table = useReactTable({
    columns,
    data: operations as OperationStats[],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: { maxRequestCount },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    state: { pagination, sorting },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const totalPages = Math.ceil(totalRows / pagination.pageSize);
  const currentPage = pagination.pageIndex + 1;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="table-fixed text-sm [&_td]:py-2 [&_th]:h-10 [&_th]:py-2">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  className="px-3"
                  key={header.id}
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow className="hover:bg-muted/50" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    className="px-3 py-2"
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={columns.length}>
                No operations found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell className="px-3" colSpan={columns.length}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Show</span>
                  <NativeSelect
                    className="[&_select]:cursor-pointer [&_select]:h-6 [&_select]:py-0 [&_select]:rounded [&_select]:bg-transparent! [&_select]:pl-2 [&_select]:pr-5 [&_select]:text-muted-foreground [&_svg]:right-1.5 [&_svg]:size-2.5 [&_svg]:text-muted-foreground"
                    onChange={(e) => {
                      table.setPageSize(Number(e.target.value));
                    }}
                    value={pagination.pageSize}
                  >
                    <NativeSelectOption value={10}>10</NativeSelectOption>
                    <NativeSelectOption value={25}>25</NativeSelectOption>
                    <NativeSelectOption value={50}>50</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-1 tabular-nums text-muted-foreground">
                    {currentPage} of {totalPages}
                  </span>
                  <button
                    className="cursor-pointer rounded border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                    type="button"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    className="cursor-pointer rounded border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                    type="button"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
});

OperationsTable.displayName = 'OperationsTable';

function OperationsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="table-fixed text-sm [&_td]:py-2 [&_th]:h-10 [&_th]:py-2">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-3" style={{ width: 300 }}>
              Operation
            </TableHead>
            <TableHead className="px-3" style={{ width: 140 }}>
              Requests
            </TableHead>
            <TableHead className="px-3" style={{ width: 140 }}>
              Latency
            </TableHead>
            <TableHead className="px-3" style={{ width: 140 }}>
              Error Rate
            </TableHead>
            <TableHead className="px-3" style={{ width: 48 }} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="px-3 py-2">
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Skeleton className="h-6 w-16 rounded-sm" />
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex justify-end">
                  <Skeleton className="size-6 rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell className="px-3" colSpan={5}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="size-6 rounded" />
                  <Skeleton className="size-6 rounded" />
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export { OperationsTable, OperationsTableSkeleton };
