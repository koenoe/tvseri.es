import {
  flexRender,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  useTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  getErrorRateColor,
  getLatencyColor,
  toStatusCodes,
} from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';
import { RouteLabel } from './endpoint-label';
import { SortIndicator } from './endpoints-table/sort-indicator';
import { RequestBar } from './request-bar';
import { StatusCodePopover } from './status-code-popover';
import { type ApiColumnDef, apiTableFeatures } from './table-features';
import { ErrorRateSparkline, LatencySparkline } from './table-sparklines';

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

const columns: ApiColumnDef<OperationStats>[] = [
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
        onClick={column.getToggleSortingHandler()}
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
        onClick={column.getToggleSortingHandler()}
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
      <button
        className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
        onClick={column.getToggleSortingHandler()}
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
      <button
        className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
        onClick={column.getToggleSortingHandler()}
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

  const table = useTable({
    autoResetPageIndex: false,
    columns,
    data: operations as OperationStats[],
    features: apiTableFeatures,
    meta: { maxRequestCount },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    state: { pagination, sorting },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const totalPages = Math.ceil(totalRows / pagination.pageSize);
  const currentPage = pagination.pageIndex + 1;

  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      table.setPageSize(Number(event.target.value));
    },
    [table],
  );
  const handlePreviousPage = useCallback(() => table.previousPage(), [table]);
  const handleNextPage = useCallback(() => table.nextPage(), [table]);

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
                {row.getAllCells().map((cell) => (
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
                    onChange={handlePageSizeChange}
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
                    onClick={handlePreviousPage}
                    type="button"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    className="cursor-pointer rounded border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanNextPage()}
                    onClick={handleNextPage}
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
