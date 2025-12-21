import { useNavigate } from '@tanstack/react-router';
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
import type { EndpointMetrics } from '@tvseri.es/schemas';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronRight as RowChevron,
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { ScoreRing } from '@/components/ui/score-ring';
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
import { formatPageViews } from '@/lib/api/utils';
import {
  formatErrorRate,
  formatLatency,
  sortDependencyKeys,
} from '@/lib/api-metrics';
import { DependencyBadge } from './dependency-badge';
import { MethodBadge, parseEndpoint, RouteLabel } from './endpoint-label';

type EndpointsTableProps = Readonly<{
  endpoints: ReadonlyArray<EndpointMetrics>;
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange: (sorting: SortingState) => void;
  pagination: PaginationState;
  sorting: SortingState;
}>;

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

const SPARKLINE_WIDTH = 48;
const SPARKLINE_HEIGHT = 16;

function LatencySparkline({
  series,
}: Readonly<{
  series: ReadonlyArray<{ date: string; p75: number }> | undefined;
}>) {
  const path = useMemo(() => {
    if (!series || series.length === 0) return '';
    return getSmoothSparklinePath(
      series.map((s) => s.p75),
      SPARKLINE_WIDTH,
      SPARKLINE_HEIGHT,
    );
  }, [series]);

  if (!path) return <div className="h-4 w-12" />;

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        className="stroke-muted-foreground/50"
        d={path}
        fill="none"
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
  series:
    | ReadonlyArray<{ date: string; errorRate?: number; p75: number }>
    | undefined;
}>) {
  const path = useMemo(() => {
    if (!series || series.length === 0) return '';
    const errorRates = series.map((s) => s.errorRate ?? 0);
    const hasVariation = errorRates.some((r) => r !== errorRates[0]);
    if (!hasVariation) return '';
    return getSharpSparklinePath(errorRates, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);
  }, [series]);

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
          className="stroke-muted-foreground/50"
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
        className="stroke-muted-foreground/50"
        d={path}
        fill="none"
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

const columns: ColumnDef<EndpointMetrics>[] = [
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
            {formatPageViews(value)}
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
            <DependencyBadge key={dep} name={dep} />
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
        <RowChevron className="size-4 text-muted-foreground" />
      </div>
    ),
    enableSorting: false,
    header: () => null,
    id: 'chevron',
    maxSize: 32,
    size: 32,
  },
];

declare module '@tanstack/react-table' {
  // biome-ignore lint/correctness/noUnusedVariables: Required for module augmentation
  interface TableMeta<TData> {
    maxRequestCount: number;
  }
}

const EndpointsTable = memo(function EndpointsTable({
  endpoints,
  onPaginationChange,
  onSortingChange,
  pagination,
  sorting,
}: EndpointsTableProps) {
  const navigate = useNavigate();

  const maxRequestCount = useMemo(
    () => Math.max(...endpoints.map((e) => e.requestCount), 1),
    [endpoints],
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
    data: endpoints as EndpointMetrics[],
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

  const handleRowClick = useCallback(
    (endpoint: string) => {
      navigate({
        search: { endpoint },
        to: '/api/endpoints',
      });
    },
    [navigate],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="table-fixed text-sm [&_td]:py-2 [&_th]:h-10 [&_th]:py-2">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isChevron = header.id === 'chevron';
                return (
                  <TableHead
                    className={isChevron ? 'w-[1%] px-3' : 'px-3'}
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
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                className="cursor-pointer"
                key={row.id}
                onClick={() => handleRowClick(row.original.endpoint)}
              >
                {row.getVisibleCells().map((cell) => {
                  const isChevron = cell.column.id === 'chevron';
                  return (
                    <TableCell
                      className={isChevron ? 'w-[1%] px-3 py-2' : 'px-3 py-2'}
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={columns.length}>
                No endpoints found.
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

EndpointsTable.displayName = 'EndpointsTable';

function EndpointsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="table-fixed text-sm [&_td]:py-2 [&_th]:h-10 [&_th]:py-2">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-3" style={{ width: 320 }}>
              Route
            </TableHead>
            <TableHead className="px-3" style={{ width: 140 }}>
              Requests
            </TableHead>
            <TableHead className="px-3" style={{ width: 140 }}>
              Latency
            </TableHead>
            <TableHead className="px-3" style={{ width: 80 }}>
              Apdex
            </TableHead>
            <TableHead className="px-3" style={{ width: 140 }}>
              Error Rate
            </TableHead>
            <TableHead className="px-3" style={{ width: 120 }}>
              Dependencies
            </TableHead>
            <TableHead className="w-[1%] px-3" style={{ width: 32 }} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-10 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
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
                <Skeleton className="size-8 rounded-full" />
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Skeleton className="h-4 w-12 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </TableCell>
              <TableCell className="w-[1%] px-3 py-2">
                <div className="flex justify-end">
                  <Skeleton className="size-4" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell className="px-3" colSpan={7}>
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

export { EndpointsTable, EndpointsTableSkeleton };
